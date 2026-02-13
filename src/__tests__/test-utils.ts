/**
 * Test Utilities
 * AI Math Tutor V2
 *
 * Shared utilities, mocks, and helpers for testing.
 */

import { vi } from 'vitest';
import { Message, TutorMode } from '@/types';

/**
 * Mock message factory for testing
 */
export function createMockMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: crypto.randomUUID(),
    role: 'user',
    content: 'What is 2 + 2?',
    timestamp: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Create multiple mock messages
 */
export function createMockMessages(count: number, role: 'user' | 'assistant' = 'user'): Message[] {
  return Array.from({ length: count }, (_, i) =>
    createMockMessage({
      id: crypto.randomUUID(),
      role,
      content: `Test message ${i + 1}`,
    })
  );
}

/**
 * Mock chat request data
 */
export interface MockChatRequest {
  messages: Message[];
  mode: TutorMode;
  image?: string;
  quizQuestionContext?: {
    questionNumber: number;
    totalQuestions: number;
    question: { topic: string };
  };
}

export function createMockChatRequest(overrides: Partial<MockChatRequest> = {}): MockChatRequest {
  return {
    messages: [createMockMessage()],
    mode: 'TEACH',
    ...overrides,
  };
}

/**
 * Mock quiz request data
 */
export interface MockQuizRequest {
  level: 'P1' | 'P2' | 'P3' | 'P4' | 'P5' | 'P6';
  topics: string[];
  difficulty: 'easy' | 'medium' | 'hard' | 'all';
  questionCount: 5 | 10 | 15 | 20;
}

export function createMockQuizRequest(overrides: Partial<MockQuizRequest> = {}): MockQuizRequest {
  return {
    level: 'P4',
    topics: ['Fractions', 'Decimals'],
    difficulty: 'medium',
    questionCount: 10,
    ...overrides,
  };
}

/**
 * Mock base64 image data
 */
export const MOCK_BASE64_IMAGE = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCADIAfADASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEBAQEAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD';

/**
 * Mock environment variables for testing
 */
export function mockEnvVariables(env: Record<string, string>) {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Set test environment variables
    Object.entries(env).forEach(([key, value]) => {
      process.env[key] = value;
    });
  });

  afterEach(() => {
    // Restore original environment
    Object.keys(process.env).forEach((key) => {
      delete process.env[key];
    });
    Object.assign(process.env, originalEnv);
  });
}

/**
 * Mock streaming response generator
 */
export async function* mockStreamResponse(chunks: string[]) {
  for (const chunk of chunks) {
    await new Promise((resolve) => setTimeout(resolve, 10));
    yield chunk;
  }
}

/**
 * Wait for async operations
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Flush pending promises
 */
export async function flushPromises(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * Create a mock fetch response
 */
export function createMockResponse(data: unknown, status = 200, ok = true): Response {
  return {
    ok,
    status,
    json: async () => data,
    text: async () => JSON.stringify(data),
    blob: async () => new Blob([JSON.stringify(data)]),
    headers: new Headers({
      'content-type': 'application/json',
    }),
  } as Response;
}

/**
 * Spy on console output
 */
export function spyOnConsole() {
  return {
    error: vi.spyOn(console, 'error').mockImplementation(() => {}),
    warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
    log: vi.spyOn(console, 'log').mockImplementation(() => {}),
    info: vi.spyOn(console, 'info').mockImplementation(() => {}),
  };
}

/**
 * Create test context with common test data
 */
export interface TestContext {
  mockUserMessage: Message;
  mockAssistantMessage: Message;
  mockMessages: Message[];
  mockChatRequest: MockChatRequest;
  mockQuizRequest: MockQuizRequest;
  mockImage: string;
}

export function createTestContext(): TestContext {
  return {
    mockUserMessage: createMockMessage({ role: 'user', content: 'What is 2 + 2?' }),
    mockAssistantMessage: createMockMessage({
      role: 'assistant',
      content: '2 + 2 equals 4.',
    }),
    mockMessages: [
      createMockMessage({ role: 'user', content: 'What is 2 + 2?' }),
      createMockMessage({ role: 'assistant', content: '2 + 2 equals 4.' }),
    ],
    mockChatRequest: createMockChatRequest(),
    mockQuizRequest: createMockQuizRequest(),
    mockImage: MOCK_BASE64_IMAGE,
  };
}

/**
 * Helper to test async errors
 */
export async function expectAsyncError<T>(
  fn: () => Promise<T>,
  errorClass?: new (...args: unknown[]) => Error
): Promise<Error> {
  let error: Error | undefined;

  try {
    await fn();
  } catch (e) {
    error = e as Error;
  }

  if (!error) {
    throw new Error('Expected function to throw an error, but it did not');
  }

  if (errorClass && !(error instanceof errorClass)) {
    throw new Error(
      `Expected error to be instance of ${errorClass.name}, but got ${error.constructor.name}`
    );
  }

  return error;
}
