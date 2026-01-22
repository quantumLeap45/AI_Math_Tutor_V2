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
import { getUserFriendlyErrorMessage } from './error-utils';
import { RAGContext } from './rag/types';

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
 * @param ragContext - Optional RAG context with example questions
 * @returns AsyncGenerator yielding text chunks
 */
export async function* streamChat(
  messages: Message[],
  mode: TutorMode,
  image?: string,
  ragContext?: RAGContext
): AsyncGenerator<string, void, unknown> {
  const systemPrompt = buildSystemPrompt(mode, ragContext);

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
    console.error('Gemini API error:', error);
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
 * @param ragContext - Optional RAG context with example questions
 * @returns Complete response text
 */
export async function sendChat(
  messages: Message[],
  mode: TutorMode,
  image?: string,
  ragContext?: RAGContext
): Promise<string> {
  let response = '';

  for await (const chunk of streamChat(messages, mode, image, ragContext)) {
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
 * Check if the Gemini API key is configured
 */
export function isConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

/**
 * Health check - verifies Gemini API is responding
 * Returns true if Gemini is available, false if quota exceeded or error
 *
 * This is called before running RAG to avoid wasting OpenAI embedding costs
 * when Gemini is unavailable.
 */
export async function checkHealth(): Promise<{ available: boolean; error?: string }> {
  try {
    // Send a minimal request to test availability
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: [{ role: 'user', parts: [{ text: 'ping' }] }],
    });

    // If we get a response, Gemini is available
    return { available: true };
  } catch (error: any) {
    console.error('Gemini health check failed:', error);

    // Check for quota/rate limit errors
    const errorMsg = String(error).toLowerCase();
    if (
      errorMsg.includes('quota') ||
      errorMsg.includes('limit') ||
      errorMsg.includes('exceeded') ||
      errorMsg.includes('429')
    ) {
      return {
        available: false,
        error: 'Gemini API quota exceeded. Please try again later.',
      };
    }

    // Other errors - might be temporary, allow proceeding
    return { available: true };
  }
}
