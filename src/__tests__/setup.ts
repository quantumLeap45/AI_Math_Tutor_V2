/**
 * Vitest Setup File
 * AI Math Tutor V2
 *
 * Global test setup and configuration.
 */

import { expect, beforeEach, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers);

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock environment variables for testing
const mockEnv = {
  GEMINI_API_KEY: 'test-gemini-api-key-12345',
  GEMINI_MODEL: 'gemini-2.5-flash',
  NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
  PINECONE_API_KEY: 'test-pinecone-key',
  PINECONE_INDEX: 'test-index',
  PINECONE_ENVIRONMENT: 'test',
  OPENAI_API_KEY: 'test-openai-key',
  RATE_LIMIT_WINDOW_MS: '60000',
  RATE_LIMIT_MAX_REQUESTS: '20',
  DAILY_QUOTA_LIMIT: '30',
  MAX_SESSIONS: '50',
  MAX_MESSAGES_PER_SESSION: '100',
};

// Set environment variables before running tests
Object.entries(mockEnv).forEach(([key, value]) => {
  process.env[key] = value;
});

// Mock console methods to reduce noise in test output
const originalError = console.error;
const originalWarn = console.warn;

beforeEach(() => {
  console.error = vi.fn((...args) => {
    // Allow some expected errors for testing
    const msg = String(args[0] || '');
    if (msg.includes('Configuration errors')) {
      return; // Suppress expected config errors
    }
    originalError(...args);
  });

  console.warn = vi.fn((...args) => {
    // Suppress expected warnings
    const msg = String(args[0] || '');
    if (msg.includes('not configured')) {
      return; // Suppress expected service warnings
    }
    originalWarn(...args);
  });
});

afterEach(() => {
  console.error = originalError;
  console.warn = originalWarn;
});
