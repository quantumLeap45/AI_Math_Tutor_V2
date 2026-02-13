/**
 * Gemini Client Tests
 * AI Math Tutor V2
 *
 * Tests for Gemini API client functionality.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GoogleGenAI } from '@google/genai';
import {
  streamChat,
  sendChat,
  analyzeImage,
  isConfigured,
  checkHealth,
} from '@/lib/gemini';
import { Message, TutorMode } from '@/types';
import { resetConfigSingleton, createMockMessages, MOCK_BASE64_IMAGE } from '../test-utils';

// Mock the Google GenAI SDK
vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn().mockImplementation(() => ({
    models: {
      generateContentStream: vi.fn(),
      generateContent: vi.fn(),
    },
  })),
  Content: {},
}));

describe('Gemini Client', () => {
  let mockGoogleGenAI: any;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Store original environment
    originalEnv = { ...process.env };

    // Reset singleton
    resetConfigSingleton();

    // Set required environment variables
    process.env.GEMINI_API_KEY = 'test-api-key';
    process.env.GEMINI_MODEL = 'gemini-2.5-flash';

    // Clear module cache to get fresh instance
    vi.clearAllMocks();
    vi.resetModules();

    // Get mocked constructor
    mockGoogleGenAI = GoogleGenAI as unknown as {
      mockClear: () => void;
    };
  });

  afterEach(() => {
    // Restore environment
    process.env = originalEnv;
    resetConfigSingleton();
  });

  describe('isConfigured', () => {
    it('should return true when API key is set', async () => {
      // Need to re-import after setting env var
      const { isConfigured: isConfiguredTest } = await import('@/lib/gemini');

      expect(isConfiguredTest()).toBe(true);
    });

    it('should return false when API key is not set', async () => {
      delete process.env.GEMINI_API_KEY;
      resetConfigSingleton();

      const { isConfigured: isConfiguredTest } = await import('@/lib/gemini');

      expect(isConfiguredTest()).toBe(false);
    });
  });

  describe('checkHealth', () => {
    it('should return available: true when API responds', async () => {
      const mockGenerateContent = vi.fn().mockResolvedValue({
        text: 'pong',
      });

      (GoogleGenAI as any).mockImplementation(() => ({
        models: {
          generateContent: mockGenerateContent,
        },
      }));

      const result = await checkHealth();

      expect(result).toEqual({ available: true });
      expect(mockGenerateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gemini-2.5-flash',
          contents: [{ role: 'user', parts: [{ text: 'ping' }] }],
        })
      );
    });

    it('should return available: false with quota error message', async () => {
      const mockGenerateContent = vi.fn().mockRejectedValue({
        message: 'Quota exceeded',
        toString: () => 'Error: Quota exceeded',
      });

      (GoogleGenAI as any).mockImplementation(() => ({
        models: {
          generateContent: mockGenerateContent,
        },
      }));

      const result = await checkHealth();

      expect(result).toEqual({
        available: false,
        error: 'Gemini API quota exceeded. Please try again later.',
      });
    });

    it('should return available: false for 429 errors', async () => {
      const mockGenerateContent = vi.fn().mockRejectedValue({
        message: 'HTTP 429: Too many requests',
        toString: () => 'Error: HTTP 429',
      });

      (GoogleGenAI as any).mockImplementation(() => ({
        models: {
          generateContent: mockGenerateContent,
        },
      }));

      const result = await checkHealth();

      expect(result.available).toBe(false);
      expect(result.error).toContain('quota');
    });

    it('should return available: true for non-quota errors', async () => {
      const mockGenerateContent = vi.fn().mockRejectedValue({
        message: 'Network error',
        toString: () => 'Error: Network error',
      });

      (GoogleGenAI as any).mockImplementation(() => ({
        models: {
          generateContent: mockGenerateContent,
        },
      }));

      const result = await checkHealth();

      expect(result).toEqual({ available: true });
    });

    it('should return available: true for rate limit errors that are temporary', async () => {
      const mockGenerateContent = vi.fn().mockRejectedValue({
        message: 'Rate limit',
        toString: () => 'Error: Rate limit',
      });

      (GoogleGenAI as any).mockImplementation(() => ({
        models: {
          generateContent: mockGenerateContent,
        },
      }));

      const result = await checkHealth();

      expect(result.available).toBe(false);
    });
  });

  describe('streamChat', () => {
    const mockMessages: Message[] = [
      {
        id: '1',
        role: 'user',
        content: 'What is 2 + 2?',
        timestamp: '2025-01-01T12:00:00.000Z',
      },
    ];

    it('should stream text chunks from Gemini', async () => {
      const mockChunks = [{ text: '2 + 2' }, { text: ' equals ' }, { text: '4.' }];
      const asyncGenerator = (async function* () {
        for (const chunk of mockChunks) {
          yield chunk;
        }
      })();

      const mockGenerateContentStream = vi.fn().mockResolvedValue(asyncGenerator);

      (GoogleGenAI as any).mockImplementation(() => ({
        models: {
          generateContentStream: mockGenerateContentStream,
        },
      }));

      const chunks: string[] = [];
      for await (const chunk of streamChat(mockMessages, 'SHOW')) {
        chunks.push(chunk);
      }

      expect(chunks).toEqual(['2 + 2', ' equals ', '4.']);
      expect(mockGenerateContentStream).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gemini-2.5-flash',
          contents: expect.any(Array),
          config: expect.objectContaining({
            systemInstruction: expect.any(String),
          }),
        })
      );
    });

    it('should handle empty response', async () => {
      const asyncGenerator = (async function* () {
        yield { text: '' };
      })();

      const mockGenerateContentStream = vi.fn().mockResolvedValue(asyncGenerator);

      (GoogleGenAI as any).mockImplementation(() => ({
        models: {
          generateContentStream: mockGenerateContentStream,
        },
      }));

      const chunks: string[] = [];
      for await (const chunk of streamChat(mockMessages, 'TEACH')) {
        chunks.push(chunk);
      }

      expect(chunks).toEqual(['']);
    });

    it('should throw user-friendly error on API failure', async () => {
      const mockGenerateContentStream = vi.fn().mockRejectedValue({
        message: 'API quota exceeded',
        toString: () => 'Error: API quota exceeded',
      });

      (GoogleGenAI as any).mockImplementation(() => ({
        models: {
          generateContentStream: mockGenerateContentStream,
        },
      }));

      await expect(streamChat(mockMessages, 'SHOW')).rejects.toThrow();
    });

    it('should include system instruction based on mode', async () => {
      const asyncGenerator = (async function* () {
        yield { text: 'Response' };
      })();

      const mockGenerateContentStream = vi.fn().mockResolvedValue(asyncGenerator);

      (GoogleGenAI as any).mockImplementation(() => ({
        models: {
          generateContentStream: mockGenerateContentStream,
        },
      }));

      await (async () => {
        for await (const _chunk of streamChat(mockMessages, 'TEACH')) {
          break;
        }
      })();

      const callArgs = mockGenerateContentStream.mock.calls[0][0];
      expect(callArgs.config.systemInstruction).toContain('TEACH');
    });

    it('should convert user messages to Gemini content format', async () => {
      const asyncGenerator = (async function* () {
        yield { text: 'Response' };
      })();

      const mockGenerateContentStream = vi.fn().mockResolvedValue(asyncGenerator);

      (GoogleGenAI as any).mockImplementation(() => ({
        models: {
          generateContentStream: mockGenerateContentStream,
        },
      }));

      await (async () => {
        for await (const _chunk of streamChat(mockMessages, 'SHOW')) {
          break;
        }
      })();

      const callArgs = mockGenerateContentStream.mock.calls[0][0];
      expect(callArgs.contents).toEqual([
        { role: 'user', parts: [{ text: 'What is 2 + 2?' }] },
      ]);
    });

    it('should convert assistant messages to model role', async () => {
      const messagesWithAssistant: Message[] = [
        {
          id: '1',
          role: 'user',
          content: 'Question',
          timestamp: '2025-01-01T12:00:00.000Z',
        },
        {
          id: '2',
          role: 'assistant',
          content: 'Answer',
          timestamp: '2025-01-01T12:00:01.000Z',
        },
      ];

      const asyncGenerator = (async function* () {
        yield { text: 'Response' };
      })();

      const mockGenerateContentStream = vi.fn().mockResolvedValue(asyncGenerator);

      (GoogleGenAI as any).mockImplementation(() => ({
        models: {
          generateContentStream: mockGenerateContentStream,
        },
      }));

      await (async () => {
        for await (const _chunk of streamChat(messagesWithAssistant, 'SHOW')) {
          break;
        }
      })();

      const callArgs = mockGenerateContentStream.mock.calls[0][0];
      expect(callArgs.contents).toEqual([
        { role: 'user', parts: [{ text: 'Question' }] },
        { role: 'model', parts: [{ text: 'Answer' }] },
      ]);
    });
  });

  describe('streamChat with Image', () => {
    const mockMessages: Message[] = [
      {
        id: '1',
        role: 'user',
        content: 'What is in this image?',
        timestamp: '2025-01-01T12:00:00.000Z',
      },
    ];

    it('should add image to last user message', async () => {
      const asyncGenerator = (async function* () {
        yield { text: 'I see a math problem' };
      })();

      const mockGenerateContentStream = vi.fn().mockResolvedValue(asyncGenerator);

      (GoogleGenAI as any).mockImplementation(() => ({
        models: {
          generateContentStream: mockGenerateContentStream,
        },
      }));

      await (async () => {
        for await (const _chunk of streamChat(mockMessages, 'SHOW', MOCK_BASE64_IMAGE)) {
          break;
        }
      })();

      const callArgs = mockGenerateContentStream.mock.calls[0][0];
      const lastContent = callArgs.contents[0];

      expect(lastContent.parts[0]).toEqual({
        inlineData: {
          mimeType: 'image/jpeg',
          data: expect.any(String),
        },
      });
      expect(lastContent.parts[1]).toEqual({ text: 'What is in this image?' });
    });

    it('should handle base64 image with data prefix', async () => {
      const imageWithPrefix = 'data:image/jpeg;base64,abc123';

      const asyncGenerator = (async function* () {
        yield { text: 'Response' };
      })();

      const mockGenerateContentStream = vi.fn().mockResolvedValue(asyncGenerator);

      (GoogleGenAI as any).mockImplementation(() => ({
        models: {
          generateContentStream: mockGenerateContentStream,
        },
      }));

      await (async () => {
        for await (const _chunk of streamChat(mockMessages, 'SHOW', imageWithPrefix)) {
          break;
        }
      })();

      const callArgs = mockGenerateContentStream.mock.calls[0][0];
      const imageData = callArgs.contents[0].parts[0].inlineData.data;

      expect(imageData).toBe('abc123');
    });

    it('should handle base64 image without data prefix', async () => {
      const imageWithoutPrefix = 'rawbase64data';

      const asyncGenerator = (async function* () {
        yield { text: 'Response' };
      })();

      const mockGenerateContentStream = vi.fn().mockResolvedValue(asyncGenerator);

      (GoogleGenAI as any).mockImplementation(() => ({
        models: {
          generateContentStream: mockGenerateContentStream,
        },
      }));

      await (async () => {
        for await (const _chunk of streamChat(mockMessages, 'SHOW', imageWithoutPrefix)) {
          break;
        }
      })();

      const callArgs = mockGenerateContentStream.mock.calls[0][0];
      const imageData = callArgs.contents[0].parts[0].inlineData.data;

      expect(imageData).toBe('rawbase64data');
    });

    it('should handle image with multiple user messages', async () => {
      const messagesWithMultipleUsers: Message[] = [
        {
          id: '1',
          role: 'user',
          content: 'First question',
          timestamp: '2025-01-01T12:00:00.000Z',
        },
        {
          id: '2',
          role: 'assistant',
          content: 'First answer',
          timestamp: '2025-01-01T12:00:01.000Z',
        },
        {
          id: '3',
          role: 'user',
          content: 'Second question',
          timestamp: '2025-01-01T12:00:02.000Z',
        },
      ];

      const asyncGenerator = (async function* () {
        yield { text: 'Response' };
      })();

      const mockGenerateContentStream = vi.fn().mockResolvedValue(asyncGenerator);

      (GoogleGenAI as any).mockImplementation(() => ({
        models: {
          generateContentStream: mockGenerateContentStream,
        },
      }));

      await (async () => {
        for await (const _chunk of streamChat(messagesWithMultipleUsers, 'SHOW', MOCK_BASE64_IMAGE)) {
          break;
        }
      })();

      const callArgs = mockGenerateContentStream.mock.calls[0][0];
      // Image should be added to the last user message (index 2)
      const lastUserMessage = callArgs.contents[2];

      expect(lastUserMessage.parts[0]).toEqual({
        inlineData: expect.objectContaining({
          mimeType: 'image/jpeg',
        }),
      });
    });
  });

  describe('streamChat with RAG Context', () => {
    const mockMessages: Message[] = [
      {
        id: '1',
        role: 'user',
        content: 'What is 2 + 2?',
        timestamp: '2025-01-01T12:00:00.000Z',
      },
    ];

    it('should include RAG context in system prompt', async () => {
      const ragContext = {
        count: 2,
        formattedContext: 'Example questions:\n1. 1+1=2\n2. 2+2=4',
        examples: [],
      };

      const asyncGenerator = (async function* () {
        yield { text: 'Response' };
      })();

      const mockGenerateContentStream = vi.fn().mockResolvedValue(asyncGenerator);

      (GoogleGenAI as any).mockImplementation(() => ({
        models: {
          generateContentStream: mockGenerateContentStream,
        },
      }));

      await (async () => {
        for await (const _chunk of streamChat(mockMessages, 'SHOW', undefined, ragContext)) {
          break;
        }
      })();

      const callArgs = mockGenerateContentStream.mock.calls[0][0];
      expect(callArgs.config.systemInstruction).toContain('Example questions');
    });
  });

  describe('sendChat (non-streaming)', () => {
    it('should accumulate all chunks into single response', async () => {
      const mockChunks = [
        { text: 'Hello' },
        { text: ', ' },
        { text: 'world' },
        { text: '!' },
      ];
      const asyncGenerator = (async function* () {
        for (const chunk of mockChunks) {
          yield chunk;
        }
      })();

      const mockGenerateContentStream = vi.fn().mockResolvedValue(asyncGenerator);

      (GoogleGenAI as any).mockImplementation(() => ({
        models: {
          generateContentStream: mockGenerateContentStream,
        },
      }));

      const response = await sendChat(
        [
          {
            id: '1',
            role: 'user',
            content: 'Say hello',
            timestamp: '2025-01-01T12:00:00.000Z',
          },
        ],
        'SHOW'
      );

      expect(response).toBe('Hello, world!');
    });

    it('should handle empty response', async () => {
      const asyncGenerator = (async function* () {
        yield { text: '' };
      })();

      const mockGenerateContentStream = vi.fn().mockResolvedValue(asyncGenerator);

      (GoogleGenAI as any).mockImplementation(() => ({
        models: {
          generateContentStream: mockGenerateContentStream,
        },
      }));

      const response = await sendChat(
        [
          {
            id: '1',
            role: 'user',
            content: 'Test',
            timestamp: '2025-01-01T12:00:00.000Z',
          },
        ],
        'SHOW'
      );

      expect(response).toBe('');
    });

    it('should propagate errors from streamChat', async () => {
      const mockGenerateContentStream = vi.fn().mockRejectedValue(new Error('API Error'));

      (GoogleGenAI as any).mockImplementation(() => ({
        models: {
          generateContentStream: mockGenerateContentStream,
        },
      }));

      await expect(
        sendChat(
          [
            {
              id: '1',
              role: 'user',
              content: 'Test',
              timestamp: '2025-01-01T12:00:00.000Z',
            },
          ],
          'SHOW'
        )
      ).rejects.toThrow();
    });
  });

  describe('analyzeImage', () => {
    it('should analyze image and return text', async () => {
      const mockResponse = {
        text: 'This is a math problem about fractions.',
      };

      const mockGenerateContent = vi.fn().mockResolvedValue(mockResponse);

      (GoogleGenAI as any).mockImplementation(() => ({
        models: {
          generateContent: mockGenerateContent,
        },
      }));

      const result = await analyzeImage(MOCK_BASE64_IMAGE, 'What is this?', 'SHOW');

      expect(result).toBe('This is a math problem about fractions.');
      expect(mockGenerateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gemini-2.5-flash',
          contents: [
            {
              role: 'user',
              parts: [
                {
                  inlineData: {
                    mimeType: 'image/jpeg',
                    data: expect.any(String),
                  },
                },
                { text: 'What is this?' },
              ],
            },
          ],
          config: expect.objectContaining({
            systemInstruction: expect.any(String),
          }),
        })
      );
    });

    it('should handle base64 image with data prefix', async () => {
      const mockResponse = { text: 'Analysis' };
      const mockGenerateContent = vi.fn().mockResolvedValue(mockResponse);

      (GoogleGenAI as any).mockImplementation(() => ({
        models: {
          generateContent: mockGenerateContent,
        },
      }));

      await analyzeImage('data:image/jpeg;base64,abc123', 'Prompt', 'TEACH');

      const callArgs = mockGenerateContent.mock.calls[0][0];
      expect(callArgs.contents[0].parts[0].inlineData.data).toBe('abc123');
    });

    it('should handle base64 image without data prefix', async () => {
      const mockResponse = { text: 'Analysis' };
      const mockGenerateContent = vi.fn().mockResolvedValue(mockResponse);

      (GoogleGenAI as any).mockImplementation(() => ({
        models: {
          generateContent: mockGenerateContent,
        },
      }));

      await analyzeImage('rawbase64data', 'Prompt', 'SHOW');

      const callArgs = mockGenerateContent.mock.calls[0][0];
      expect(callArgs.contents[0].parts[0].inlineData.data).toBe('rawbase64data');
    });

    it('should use default prompt when not provided', async () => {
      const mockResponse = { text: 'Analysis' };
      const mockGenerateContent = vi.fn().mockResolvedValue(mockResponse);

      (GoogleGenAI as any).mockImplementation(() => ({
        models: {
          generateContent: mockGenerateContent,
        },
      }));

      await analyzeImage(MOCK_BASE64_IMAGE, undefined, 'SHOW');

      const callArgs = mockGenerateContent.mock.calls[0][0];
      expect(callArgs.contents[0].parts[1].text).toContain('analyze this math problem');
    });

    it('should use mode-specific system prompt', async () => {
      const mockResponse = { text: 'Analysis' };
      const mockGenerateContent = vi.fn().mockResolvedValue(mockResponse);

      (GoogleGenAI as any).mockImplementation(() => ({
        models: {
          generateContent: mockGenerateContent,
        },
      }));

      await analyzeImage(MOCK_BASE64_IMAGE, 'Prompt', 'TEACH');

      const callArgs = mockGenerateContent.mock.calls[0][0];
      expect(callArgs.config.systemInstruction).toContain('TEACH');
    });

    it('should handle empty response text', async () => {
      const mockResponse = { text: '' };
      const mockGenerateContent = vi.fn().mockResolvedValue(mockResponse);

      (GoogleGenAI as any).mockImplementation(() => ({
        models: {
          generateContent: mockGenerateContent,
        },
      }));

      const result = await analyzeImage(MOCK_BASE64_IMAGE, 'Prompt', 'SHOW');

      expect(result).toBe('');
    });

    it('should throw user-friendly error on failure', async () => {
      const mockGenerateContent = vi.fn().mockRejectedValue({
        message: 'API quota exceeded',
        toString: () => 'Error: API quota exceeded',
      });

      (GoogleGenAI as any).mockImplementation(() => ({
        models: {
          generateContent: mockGenerateContent,
        },
      }));

      await expect(analyzeImage(MOCK_BASE64_IMAGE, 'Prompt', 'SHOW')).rejects.toThrow();
    });

    it('should handle undefined text property', async () => {
      const mockResponse = {};
      const mockGenerateContent = vi.fn().mockResolvedValue(mockResponse);

      (GoogleGenAI as any).mockImplementation(() => ({
        models: {
          generateContent: mockGenerateContent,
        },
      }));

      const result = await analyzeImage(MOCK_BASE64_IMAGE, 'Prompt', 'SHOW');

      expect(result).toBe('');
    });
  });
});
