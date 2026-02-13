/**
 * Quiz Chat API Route (v1)
 * AI Math Tutor v2
 *
 * Handles quiz-specific chat requests with streaming responses.
 * Uses quiz-specific system prompt that guides without giving answers.
 *
 * Refactored to use enterprise-grade infrastructure:
 * - Centralized config service
 * - Zod validation schemas
 * - Standardized error handling
 */

import { NextRequest } from 'next/server';
import { GoogleGenAI, Content } from '@google/genai';
import { buildQuizSystemPrompt } from '@/lib/prompts';
import { checkRateLimit, getClientIp, getQuotaStatus } from '@/lib/rateLimit';
import { getUserFriendlyErrorMessage } from '@/lib/error-utils';
import { config } from '@/config';
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

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface QuizChatRequestBody {
  question: string;
  options?: string[];
  message: string;
  conversationHistory?: ChatMessage[];
}

// Initialize the Gemini client (server-side only)
const ai = new GoogleGenAI({
  apiKey: config.getGemini().apiKey,
});

// Model configuration - using config
const MODEL_NAME = config.getGemini().model;

// Quiz chat request validation schema
const quizChatRequestSchema = z.object({
  question: z.string().min(1, 'Question text is required'),
  options: z.array(z.string()).optional(),
  message: z.string().min(1, 'Message is required'),
  conversationHistory: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
    timestamp: z.string(),
  })).optional(),
});

/**
 * Convert chat messages to Gemini Content format
 */
function messagesToGeminiContent(messages: ChatMessage[]): Content[] {
  const contents: Content[] = [];

  for (const msg of messages) {
    contents.push({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }],
    });
  }

  return contents;
}

/**
 * POST /api/v1/quiz/chat
 * Quiz chat endpoint with streaming response
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
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
    if (!useOpenRouter && !config.getGemini().apiKey) {
      console.error('No AI provider configured');
      throw new AIError(
        ErrorCode.AI_UNAVAILABLE,
        'AI service is not configured. Please contact support.'
      );
    }

    // Parse and validate request body
    const body = await request.json();

    let validatedData: QuizChatRequestBody;
    try {
      validatedData = quizChatRequestSchema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ValidationError('request body', `Validation failed: ${error.issues.map(e => e.message).join(', ')}`);
      }
      throw new ValidationError('request body');
    }

    const { question, options, message, conversationHistory = [] } = validatedData;

    // Build quiz-specific system prompt
    const systemPrompt = buildQuizSystemPrompt(question, options);

    // Build contents for the request (include conversation history)
    const contents = messagesToGeminiContent(conversationHistory);

    // Add the new user message
    contents.push({
      role: 'user',
      parts: [{ text: message }],
    });

    // Create streaming response
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          if (useOpenRouter) {
            // Stream via OpenRouter (OpenAI-compatible API)
            const { apiKey, model } = config.getOpenRouter();
            const openAIMessages = [
              { role: 'system', content: systemPrompt },
              ...conversationHistory.map(m => ({
                role: m.role === 'user' ? 'user' : 'assistant',
                content: m.content,
              })),
              { role: 'user', content: message },
            ];

            const orResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://ai-math-tutor-v2.vercel.app',
                'X-Title': 'AI Math Tutor V2',
              },
              body: JSON.stringify({
                model,
                messages: openAIMessages,
                stream: true,
              }),
            });

            if (!orResponse.ok) {
              const errorData = await orResponse.json().catch(() => ({}));
              throw new Error(`OpenRouter API error: ${orResponse.status} ${errorData.error?.message || orResponse.statusText}`);
            }

            const reader = orResponse.body?.getReader();
            if (!reader) throw new Error('No response body from OpenRouter');

            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              buffer = lines.pop() || '';

              for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || !trimmed.startsWith('data: ')) continue;
                const data = trimmed.slice(6);
                if (data === '[DONE]') { controller.close(); return; }

                try {
                  const parsed = JSON.parse(data);
                  const content = parsed.choices?.[0]?.delta?.content;
                  if (content) controller.enqueue(encoder.encode(content));
                } catch {
                  // Skip malformed SSE lines
                }
              }
            }
          } else {
            // Use the Google GenAI SDK for streaming
            const response = await ai.models.generateContentStream({
              model: MODEL_NAME,
              contents,
              config: {
                systemInstruction: systemPrompt,
              },
            });

            // Yield text chunks as they arrive
            for await (const chunk of response) {
              if (chunk.text) {
                controller.enqueue(encoder.encode(chunk.text));
              }
            }
          }
          controller.close();
        } catch (error) {
          console.error('Quiz chat streaming error:', error);

          // Extract error message
          const errorMessage = error instanceof Error
            ? getUserFriendlyErrorMessage(error)
            : 'Something went wrong. Please try again.';

          controller.enqueue(encoder.encode(`\n\n[Error: ${errorMessage}]`));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'X-RateLimit-Remaining': String(rateLimitResult.remaining),
        'X-Daily-Quota-Remaining': String(rateLimitResult.dailyRemaining ?? rateLimitResult.quotaStatus?.remaining ?? config.getRateLimits().dailyQuotaLimit),
        'X-Daily-Quota-Limit': String(rateLimitResult.quotaStatus?.limit ?? config.getRateLimits().dailyQuotaLimit),
        'X-Daily-Quota-Resets-At': rateLimitResult.quotaStatus?.resetsAt?.toISOString() ?? '',
      },
    });
  } catch (error) {
    console.error('Quiz chat API error:', error);
    return errorToResponse(error);
  }
}

/**
 * GET /api/v1/quiz/chat
 * Returns 405 - Method not allowed
 */
export async function GET() {
  return errorToResponse(
    new ValidationError('method', 'Method not allowed. Use POST.')
  );
}

/**
 * OPTIONS /api/v1/quiz/chat
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
