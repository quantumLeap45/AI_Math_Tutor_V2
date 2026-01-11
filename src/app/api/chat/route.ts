/**
 * Chat API Route
 * AI Math Tutor v2
 *
 * Handles chat requests to the Gemini API with streaming responses.
 */

import { NextRequest, NextResponse } from 'next/server';
import { streamChat, isConfigured } from '@/lib/gemini';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { Message, TutorMode } from '@/types';

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
          for await (const chunk of streamChat(messages, mode, image)) {
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
