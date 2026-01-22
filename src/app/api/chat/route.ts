/**
 * Chat API Route
 * AI Math Tutor v2
 *
 * Handles chat requests to the Gemini API with streaming responses.
 * Integrates RAG (Retrieval-Augmented Generation) for enhanced question generation.
 */

import { NextRequest, NextResponse } from 'next/server';
import { streamChat, isConfigured, checkHealth } from '@/lib/gemini';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { Message, TutorMode } from '@/types';
import { getRAGContext, detectUserIntent } from '@/lib/rag/search';
import { isPineconeConfigured } from '@/lib/rag/pinecone';

export const runtime = 'nodejs';

interface ChatRequestBody {
  messages: Message[];
  mode: TutorMode;
  image?: string;
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = getClientIp(request);
    const rateLimitResult = checkRateLimit(ip);

    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: `Too many requests. Please wait ${rateLimitResult.retryAfter} seconds.`,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimitResult.retryAfter),
            'X-RateLimit-Remaining': '0',
          },
        }
      );
    }

    // Check API key configuration
    if (!isConfigured()) {
      console.error('GEMINI_API_KEY not configured');
      return NextResponse.json(
        { error: 'AI service is not configured. Please contact support.' },
        { status: 500 }
      );
    }

    // Parse request body
    let body: ChatRequestBody;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    const { messages, mode, image } = body;

    // Validate required fields
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'Messages array is required and must not be empty' },
        { status: 400 }
      );
    }

    if (!mode || !['SHOW', 'TEACH'].includes(mode)) {
      return NextResponse.json(
        { error: 'Valid mode (SHOW or TEACH) is required' },
        { status: 400 }
      );
    }

    // Validate messages structure
    for (const msg of messages) {
      if (!msg.role || !['user', 'assistant'].includes(msg.role)) {
        return NextResponse.json(
          { error: 'Each message must have a valid role (user or assistant)' },
          { status: 400 }
        );
      }
      if (typeof msg.content !== 'string') {
        return NextResponse.json(
          { error: 'Each message must have a content string' },
          { status: 400 }
        );
      }
    }

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
              // RAG might be needed - check Gemini health first
              const health = await checkHealth();
              if (!health.available) {
                console.log('⚠️  Gemini unavailable - skipping RAG to save costs');
                skipRAG = true;
                // Send error to user immediately
                controller.enqueue(encoder.encode(`\n\n[Error: ${health.error || 'AI service temporarily unavailable. Please try again later.'}]`));
                controller.close();
                return;
              }

              // Gemini is available, proceed with RAG
              try {
                ragContext = await getRAGContext(userQuery);
                if (ragContext.count > 0) {
                  ragUsed = true;
                  console.log(`🔍 RAG ACTIVE: Retrieved ${ragContext.count} example questions for query: "${userQuery.substring(0, 50)}..."`);
                  console.log(`🔍 RAG Examples:`, ragContext.examples.map((e: any) => e.id).join(', '));
                } else {
                  console.log(`ℹ️  RAG: No relevant examples found for query: "${userQuery.substring(0, 50)}..."`);
                }
              } catch (ragError) {
                // Log RAG error but continue without RAG context (graceful fallback)
                console.warn('RAG search failed, continuing without context:', ragError);
              }
            }
          }

          // Log RAG status for debugging (helpful for verification)
          if (!skipRAG && !ragUsed && (userQuery.includes('question') || userQuery.includes('problem') || userQuery.includes('practice'))) {
            console.log(`⚠️  RAG NOT ACTIVE: Query suggests questions but RAG didn't trigger (no examples found)`);
          }

          for await (const chunk of streamChat(messages, mode, image, ragContext)) {
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
        'X-RateLimit-Remaining': String(rateLimitResult.remaining),
        'X-Daily-Quota-Limit': '50',
      },
    });
  } catch (error) {
    console.error('Chat API error:', error);

    // Handle specific error types
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}

// Handle unsupported methods
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST.' },
    { status: 405 }
  );
}
