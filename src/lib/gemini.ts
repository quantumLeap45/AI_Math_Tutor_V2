/**
 * Gemini API Client
 * AI Math Tutor v2
 *
 * Handles communication with Google Gemini API for chat functionality.
 * Uses streaming for progressive response display.
 */

import { GoogleGenerativeAI, Content, Part } from '@google/generative-ai';
import { Message, TutorMode } from '@/types';
import { buildSystemPrompt } from './prompts';

// Initialize the Gemini client (server-side only)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Model configuration
const MODEL_NAME = 'gemini-2.0-flash';

/**
 * Convert our Message format to Gemini Content format
 */
function messagesToGeminiContent(messages: Message[]): Content[] {
  return messages.map(msg => ({
    role: msg.role === 'user' ? 'user' : 'model',
    parts: [{ text: msg.content }],
  }));
}

/**
 * Create image part for Gemini API
 */
function createImagePart(base64Image: string): Part {
  // Extract mime type and data from base64 string
  const matches = base64Image.match(/^data:(.+);base64,(.+)$/);

  if (matches) {
    return {
      inlineData: {
        mimeType: matches[1],
        data: matches[2],
      },
    };
  }

  // If no data URL prefix, assume it's raw base64 image/jpeg
  return {
    inlineData: {
      mimeType: 'image/jpeg',
      data: base64Image,
    },
  };
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
  const model = genAI.getGenerativeModel({
    model: MODEL_NAME,
    systemInstruction: buildSystemPrompt(mode),
  });

  // Build the content for the request
  const history = messagesToGeminiContent(messages.slice(0, -1));
  const lastMessage = messages[messages.length - 1];

  // Build parts for the last message
  const parts: Part[] = [];

  // Add image if provided
  if (image) {
    parts.push(createImagePart(image));
  }

  // Add text content
  parts.push({ text: lastMessage.content });

  // Start chat with history
  const chat = model.startChat({
    history,
    generationConfig: {
      maxOutputTokens: 2048,
      temperature: 0.7,
      topP: 0.9,
    },
  });

  try {
    // Send message and get streaming response
    const result = await chat.sendMessageStream(parts);

    // Yield text chunks as they arrive
    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) {
        yield text;
      }
    }
  } catch (error) {
    console.error('Gemini API error:', error);
    throw new Error(
      error instanceof Error
        ? error.message
        : 'Failed to get response from AI. Please try again.'
    );
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
  const model = genAI.getGenerativeModel({
    model: MODEL_NAME,
    systemInstruction: buildSystemPrompt(mode),
  });

  const parts: Part[] = [
    createImagePart(image),
    { text: prompt || 'Please analyze this math problem and help me solve it.' },
  ];

  try {
    const result = await model.generateContent(parts);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Gemini image analysis error:', error);
    throw new Error(
      error instanceof Error
        ? error.message
        : 'Failed to analyze image. Please try again.'
    );
  }
}

/**
 * Check if the Gemini API key is configured
 */
export function isConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}
