/**
 * Gemini API Client
 * AI Math Tutor v2
 *
 * Handles communication with Google Gemini API for chat functionality.
 * Uses the new Google GenAI SDK (released 2025).
 * Uses streaming for progressive response display.
 */

import { GoogleGenAI, Content } from '@google/genai';
import { Message, TutorMode } from '@/types';
import { buildSystemPrompt } from './prompts';

// Initialize the Gemini client (server-side only)
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
});

// Model configuration - using new Gemini 2.5 Flash model
const MODEL_NAME = 'gemini-2.5-flash';

/**
 * Convert our Message format to Gemini Content format
 */
function messagesToGeminiContent(messages: Message[]): Content[] {
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
 * Stream chat response from Gemini API
 *
 * @param messages - Conversation history
 * @param mode - Tutor mode (SHOW or TEACH)
 * @param image - Optional base64 image
 * @returns AsyncGenerator yielding text chunks
 */
export async function* streamChat(
  messages: Message[],
  mode: TutorMode,
  image?: string
): AsyncGenerator<string, void, unknown> {
  const systemPrompt = buildSystemPrompt(mode);

  // Build contents for the request
  const contents = messagesToGeminiContent(messages);

  // Add image if provided (add to the last user message)
  if (image && contents.length > 0) {
    const lastUserMessageIndex = contents.findLastIndex(c => c.role === 'user');
    if (lastUserMessageIndex >= 0) {
      const lastContent = contents[lastUserMessageIndex];
      // Add image part to the last user message
      if (Array.isArray(lastContent.parts)) {
        lastContent.parts.unshift({
          inlineData: {
            mimeType: 'image/jpeg',
            data: image.includes(',') ? image.split(',')[1] : image,
          },
        });
      }
    }
  }

  try {
    // Use the new Google GenAI SDK for streaming
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
        yield chunk.text;
      }
    }
  } catch (error) {
    // Log raw error BEFORE conversion
    const rawError = error instanceof Error ? error.message : String(error);
    console.log('[RAW API ERROR]', rawError);

    // For debugging, yield the raw error
    yield `\n\n[RAW ERROR: ${rawError}]`;

    const userMessage = getUserFriendlyErrorMessage(error);
    throw new Error(userMessage);
  }
}

/**
 * Non-streaming chat (for simpler use cases)
 *
 * @param messages - Conversation history
 * @param mode - Tutor mode (SHOW or TEACH)
 * @param image - Optional base64 image
 * @returns Complete response text
 */
export async function sendChat(
  messages: Message[],
  mode: TutorMode,
  image?: string
): Promise<string> {
  let response = '';

  for await (const chunk of streamChat(messages, mode, image)) {
    response += chunk;
  }

  return response;
}

/**
 * Analyze an image without conversation context
 *
 * @param image - Base64 encoded image
 * @param prompt - Question about the image
 * @param mode - Tutor mode
 * @returns Analysis result
 */
export async function analyzeImage(
  image: string,
  prompt: string,
  mode: TutorMode
): Promise<string> {
  const systemPrompt = buildSystemPrompt(mode);

  const imageData = image.includes(',') ? image.split(',')[1] : image;

  const contents: Content[] = [
    {
      role: 'user',
      parts: [
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: imageData,
          },
        },
        { text: prompt || 'Please analyze this math problem and help me solve it.' },
      ],
    },
  ];

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents,
      config: {
        systemInstruction: systemPrompt,
      },
    });

    return response.text || '';
  } catch (error) {
    console.error('Gemini image analysis error:', error);
    const userMessage = getUserFriendlyErrorMessage(error);
    throw new Error(userMessage);
  }
}

/**
 * Convert API errors to user-friendly messages
 * Detects common error patterns and returns clean, actionable messages
 *
 * @param error - The error object from the API
 * @returns A user-friendly error message
 */
function getUserFriendlyErrorMessage(error: unknown): string {
  const DEFAULT_MESSAGE = 'Something went wrong. Please try again.';

  if (!error) return DEFAULT_MESSAGE;

  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorLower = errorMessage.toLowerCase();

  // TEMPORARY: Log the actual error for debugging
  console.log('[DEBUG] Raw error:', errorMessage);

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

  // TEMPORARY: Return raw error for debugging
  return `DEBUG: ${errorMessage}`;
}

/**
 * Check if the Gemini API key is configured
 */
export function isConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}
