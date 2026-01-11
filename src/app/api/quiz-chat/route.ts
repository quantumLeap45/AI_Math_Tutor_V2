/**
 * Quiz Chat API Route
 * AI Math Tutor v2
 *
 * Handles quiz-specific chat requests with streaming responses.
 * Uses quiz-specific system prompt that guides without giving answers.
 */

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Content } from '@google/genai';
import { buildQuizSystemPrompt } from '@/lib/prompts';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';

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
  apiKey: process.env.GEMINI_API_KEY || '',
});

// Model configuration - using new Gemini 2.5 Flash model
const MODEL_NAME = 'gemini-2.5-flash';

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
 * Check if the Gemini API key is configured
 */
function isConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

/**
 * Convert API errors to user-friendly messages
 */
function getUserFriendlyErrorMessage(error: unknown): string {
  const DEFAULT_MESSAGE = 'Something went wrong. Please try again.';

  if (!error) return DEFAULT_MESSAGE;

  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorLower = errorMessage.toLowerCase();

  // Quota/limit errors
  if (
    errorLower.includes('quota') ||
    errorLower.includes('limit') ||
    errorLower.includes('429') ||
    errorLower.includes('exceeded')
  ) {
    return 'AI service limit reached. Please wait a moment and try again.';
  }

  // Authentication errors
  if (
    errorLower.includes('auth') ||
    errorLower.includes('unauthorized') ||
    errorLower.includes('401') ||
    errorLower.includes('403') ||
    errorLower.includes('api key')
  ) {
    return 'AI service is currently unavailable. Please try again later.';
  }

  // Network/connection errors
  if (
    errorLower.includes('network') ||
    errorLower.includes('connect') ||
    errorLower.includes('fetch') ||
    errorLower.includes('timeout') ||
    errorLower.includes('econnrefused')
  ) {
    return 'Connection problem. Please check your internet and try again.';
  }

  // Content safety/policy errors
  if (
    errorLower.includes('safety') ||
    errorLower.includes('policy') ||
    errorLower.includes('blocked') ||
    errorLower.includes('inappropriate')
  ) {
    return 'This content cannot be processed. Please try a different question.';
  }

  // Server errors
  if (
    errorLower.includes('500') ||
    errorLower.includes('502') ||
    errorLower.includes('503') ||
    errorLower.includes('server error')
  ) {
    return 'AI service is temporarily unavailable. Please try again later.';
  }

  return DEFAULT_MESSAGE;
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
    let body: QuizChatRequestBody;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    const { question, options, message, conversationHistory = [] } = body;

    // Validate required fields
    if (!question || typeof question !== 'string') {
      return NextResponse.json(
        { error: 'Question text is required' },
        { status: 400 }
      );
    }

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

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
      },
    });
  } catch (error) {
    console.error('Quiz chat API error:', error);

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
