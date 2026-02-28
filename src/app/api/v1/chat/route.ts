/**
 * Chat API Route (v1)
 * AI Math Tutor v2
 *
 * Handles chat requests to the Gemini API with streaming responses.
 * Integrates RAG (Retrieval-Augmented Generation) for enhanced question generation.
 *
 * Refactored to use enterprise-grade infrastructure:
 * - Centralized config service
 * - Zod validation schemas
 * - Standardized error handling
 */

import { NextRequest } from 'next/server';
import { streamChat, streamChatWithOpenRouter, isConfigured as isGeminiConfigured, checkHealth } from '@/lib/gemini';
import { checkRateLimit, getClientIp, getQuotaStatus } from '@/lib/rateLimit';
import { Message, TutorMode } from '@/types';
import { getRAGContext, detectUserIntent } from '@/lib/rag/search';
import { isPineconeConfigured } from '@/lib/rag/pinecone';
import { config } from '@/config';
import {
  validateChatRequest,
  ChatRequest,
  formatZodError,
} from '@/lib/validation';
import {
  errorToResponse,
  ValidationError,
  QuotaError,
  RateLimitError,
  AIError,
  ErrorCode,
} from '@/lib/errors';
import { z } from 'zod';

export const runtime = 'nodejs';

/**
 * POST /api/v1/chat
 * Main chat endpoint with streaming response
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting (both anti-spam and daily quota)
    const ip = getClientIp(request);
    const rateLimitResult = await checkRateLimit(ip);

    if (!rateLimitResult.success) {
      // Check if this is a daily quota exceeded error
      if (rateLimitResult.quotaStatus && rateLimitResult.dailyRemaining !== undefined) {
        const resetsAt = rateLimitResult.quotaStatus.resetsAt;
        throw new QuotaError(resetsAt);
      }

      // Anti-spam rate limit exceeded
      throw new RateLimitError(rateLimitResult.retryAfter);
    }

    // Check AI provider configuration
    const useOpenRouter = config.isOpenRouterConfigured();
    if (!useOpenRouter && !isGeminiConfigured()) {
      console.error('No AI provider configured');
      throw new AIError(
        ErrorCode.AI_UNAVAILABLE,
        'AI service is not configured. Please contact support.'
      );
    }

    // Parse and validate request body
    const body = await request.json();

    // Use Zod validation
    let validatedData: ChatRequest;
    try {
      validatedData = validateChatRequest(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ValidationError('request body', formatZodError(error).error);
      }
      throw new ValidationError('request body');
    }

    const { messages, mode, images } = validatedData;

    // Create streaming response
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Get the last user message for RAG search
          const lastUserMessage = messages.filter(m => m.role === 'user').pop();
          const userQuery = lastUserMessage?.content || '';

          // Health check: Verify Gemini is available before running RAG
          // This prevents wasting OpenAI embedding costs when Gemini quota is exceeded
          let ragContext;
          let ragUsed = false;
          let skipRAG = false;

          if (isPineconeConfigured() && userQuery) {
            // Detect intent first to see if RAG is needed
            const intent = detectUserIntent(userQuery);

            if (intent.wantsQuestions || intent.topic) {
              // RAG might be needed - check AI health first (skip for OpenRouter)
              if (!useOpenRouter) {
                const health = await checkHealth();
                if (!health.available) {
                  console.log(' Gemini unavailable - skipping RAG to save costs');
                  skipRAG = true;
                  controller.enqueue(
                    encoder.encode(`\n\n[Error: ${health.error || 'AI service temporarily unavailable. Please try again later.'}]`)
                  );
                  controller.close();
                  return;
                }
              }

              // AI provider is available, proceed with RAG
              try {
                ragContext = await getRAGContext(userQuery);
                if (ragContext.count > 0) {
                  ragUsed = true;
                  console.log(` RAG ACTIVE: Retrieved ${ragContext.count} example questions for query: "${userQuery.substring(0, 50)}..."`);
                  console.log(` RAG Examples:`, ragContext.examples.map(e => e.id).join(', '));
                } else {
                  console.log(` RAG: No relevant examples found for query: "${userQuery.substring(0, 50)}..."`);
                }
              } catch (ragError) {
                console.warn('RAG search failed, continuing without context:', ragError);
              }
            }
          }

          // Log RAG status for debugging
          if (!skipRAG && !ragUsed && (userQuery.includes('question') || userQuery.includes('problem') || userQuery.includes('practice'))) {
            console.log(` RAG NOT ACTIVE: Query suggests questions but RAG didn't trigger (no examples found)`);
          }

          // Stream from the appropriate AI provider
          const chatStream = useOpenRouter
            ? streamChatWithOpenRouter(messages, mode, images, ragContext)
            : streamChat(messages, mode, images, ragContext);

          for await (const chunk of chatStream) {
            controller.enqueue(encoder.encode(chunk));
          }
          controller.close();
        } catch (error) {
          console.error('Streaming error:', error);

          // Extract error message - gemini.ts converts to user-friendly message
          const errorMessage = error instanceof Error ? error.message : 'Something went wrong. Please try again.';

          controller.enqueue(encoder.encode(`\n\n[Error: ${errorMessage}]`));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'X-RateLimit-Remaining': String(rateLimitResult.remaining || 0),
        'X-Daily-Quota-Remaining': String(rateLimitResult.dailyRemaining ?? rateLimitResult.quotaStatus?.remaining ?? config.getRateLimits().dailyQuotaLimit),
        'X-Daily-Quota-Limit': String(rateLimitResult.quotaStatus?.limit ?? config.getRateLimits().dailyQuotaLimit),
        'X-Daily-Quota-Resets-At': rateLimitResult.quotaStatus?.resetsAt?.toISOString() ?? '',
      },
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return errorToResponse(error);
  }
}

/**
 * GET /api/v1/chat
 * Returns 405 - Method not allowed
 */
export async function GET() {
  return errorToResponse(
    new ValidationError('method', 'Method not allowed. Use POST.')
  );
}

/**
 * OPTIONS /api/v1/chat
 * Returns quota status without consuming
 */
export async function OPTIONS(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const quotaStatus = await getQuotaStatus(ip);

    return new Response(JSON.stringify({ quota: 'ok' }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-Daily-Quota-Remaining': String(quotaStatus.remaining),
        'X-Daily-Quota-Limit': String(quotaStatus.limit),
        'X-Daily-Quota-Resets-At': quotaStatus.resetsAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Quota check error:', error);
    return errorToResponse(error);
  }
}
