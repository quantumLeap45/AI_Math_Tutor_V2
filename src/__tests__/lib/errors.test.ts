/**
 * Error Handling Tests
 * AI Math Tutor V2
 *
 * Tests for standardized error handling with specific error codes.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ErrorCode,
  AppError,
  AIError,
  ConfigError,
  RateLimitError,
  QuotaError,
  ValidationError,
  RAGError,
  toUserError,
  logError,
  errorToResponse,
} from '@/lib/errors';

describe('ErrorCode Enum', () => {
  it('should have all expected error codes', () => {
    // Configuration Errors
    expect(ErrorCode.CONFIG_MISSING).toBe('CONFIG_MISSING');
    expect(ErrorCode.CONFIG_INVALID).toBe('CONFIG_INVALID');

    // AI Provider Errors
    expect(ErrorCode.AI_UNAVAILABLE).toBe('AI_UNAVAILABLE');
    expect(ErrorCode.AI_QUOTA_EXCEEDED).toBe('AI_QUOTA_EXCEEDED');
    expect(ErrorCode.AI_TIMEOUT).toBe('AI_TIMEOUT');
    expect(ErrorCode.AI_STREAM_ERROR).toBe('AI_STREAM_ERROR');

    // Database Errors
    expect(ErrorCode.DB_CONNECTION_FAILED).toBe('DB_CONNECTION_FAILED');
    expect(ErrorCode.DB_QUERY_FAILED).toBe('DB_QUERY_FAILED');

    // Rate Limiting
    expect(ErrorCode.RATE_LIMIT_EXCEEDED).toBe('RATE_LIMIT_EXCEEDED');
    expect(ErrorCode.DAILY_QUOTA_EXCEEDED).toBe('DAILY_QUOTA_EXCEEDED');

    // Input Validation
    expect(ErrorCode.INVALID_INPUT).toBe('INVALID_INPUT');
    expect(ErrorCode.INVALID_IMAGE).toBe('INVALID_IMAGE');
    expect(ErrorCode.MISSING_REQUIRED_FIELD).toBe('MISSING_REQUIRED_FIELD');

    // RAG Errors
    expect(ErrorCode.RAG_SEARCH_FAILED).toBe('RAG_SEARCH_FAILED');
    expect(ErrorCode.RAG_NOT_CONFIGURED).toBe('RAG_NOT_CONFIGURED');

    // File/Storage Errors
    expect(ErrorCode.STORAGE_QUOTA_EXCEEDED).toBe('STORAGE_QUOTA_EXCEEDED');
    expect(ErrorCode.STORAGE_UNAVAILABLE).toBe('STORAGE_UNAVAILABLE');
  });
});

describe('AppError', () => {
  it('should create error with all properties', () => {
    const error = new AppError(
      ErrorCode.INVALID_INPUT,
      'Technical error message',
      'User friendly message',
      400,
      true,
      { field: 'username' }
    );

    expect(error.code).toBe(ErrorCode.INVALID_INPUT);
    expect(error.message).toBe('Technical error message');
    expect(error.userMessage).toBe('User friendly message');
    expect(error.statusCode).toBe(400);
    expect(error.isRetryable).toBe(true);
    expect(error.details).toEqual({ field: 'username' });
    expect(error.name).toBe('AppError');
  });

  it('should use default status code 500', () => {
    const error = new AppError(ErrorCode.AI_UNAVAILABLE, 'Message', 'User message');

    expect(error.statusCode).toBe(500);
  });

  it('should use default isRetryable false', () => {
    const error = new AppError(ErrorCode.INVALID_INPUT, 'Message', 'User message');

    expect(error.isRetryable).toBe(false);
  });

  it('should convert to JSON properly', () => {
    const error = new AppError(
      ErrorCode.INVALID_INPUT,
      'Technical message',
      'User message',
      400,
      false,
      { field: 'email' }
    );

    const json = error.toJSON();

    expect(json).toEqual({
      code: ErrorCode.INVALID_INPUT,
      message: 'User message',
      retryable: false,
      details: { field: 'email' },
    });
  });

  it('should not include details in JSON if not provided', () => {
    const error = new AppError(ErrorCode.INVALID_INPUT, 'Message', 'User message');

    const json = error.toJSON();

    expect(json).not.toHaveProperty('details');
  });
});

describe('AIError', () => {
  it('should create AI error with correct properties', () => {
    const error = new AIError(
      ErrorCode.AI_TIMEOUT,
      'Request timed out. Please try again.',
      true
    );

    expect(error.name).toBe('AIError');
    expect(error.code).toBe(ErrorCode.AI_TIMEOUT);
    expect(error.message).toContain('AI Error:');
    expect(error.userMessage).toBe('Request timed out. Please try again.');
    expect(error.statusCode).toBe(500);
    expect(error.isRetryable).toBe(true);
  });

  it('should include details in AI error', () => {
    const error = new AIError(
      ErrorCode.AI_QUOTA_EXCEEDED,
      'Quota exceeded',
      false,
      { quotaLimit: 100, currentUsage: 150 }
    );

    expect(error.details).toEqual({
      quotaLimit: 100,
      currentUsage: 150,
    });
  });

  it('should default isRetryable to false', () => {
    const error = new AIError(ErrorCode.AI_STREAM_ERROR, 'Stream error');

    expect(error.isRetryable).toBe(false);
  });
});

describe('ConfigError', () => {
  it('should create config error with standard properties', () => {
    const error = new ConfigError('Missing API key');

    expect(error.name).toBe('ConfigError');
    expect(error.code).toBe(ErrorCode.CONFIG_MISSING);
    expect(error.message).toContain('Configuration error');
    expect(error.userMessage).toContain('Application configuration is incomplete');
    expect(error.statusCode).toBe(500);
    expect(error.isRetryable).toBe(false);
  });

  it('should include the original message in the technical message', () => {
    const error = new ConfigError('Invalid rate limit configuration');

    expect(error.message).toBe('Configuration error: Invalid rate limit configuration');
  });
});

describe('RateLimitError', () => {
  it('should create rate limit error with retry time', () => {
    const error = new RateLimitError(60);

    expect(error.name).toBe('RateLimitError');
    expect(error.code).toBe(ErrorCode.RATE_LIMIT_EXCEEDED);
    expect(error.statusCode).toBe(429);
    expect(error.isRetryable).toBe(true);
    expect(error.details).toEqual({ retryAfter: 60 });
  });

  it('should include retry time in user message', () => {
    const error = new RateLimitError(30);

    expect(error.userMessage).toContain('30 seconds');
  });

  it('should handle missing retry time gracefully', () => {
    const error = new RateLimitError();

    expect(error.userMessage).toContain('a few seconds');
    expect(error.details).toEqual({ retryAfter: undefined });
  });
});

describe('QuotaError', () => {
  it('should create quota error with reset time', () => {
    const resetTime = new Date('2025-01-02T12:00:00Z');
    const error = new QuotaError(resetTime);

    expect(error.name).toBe('QuotaError');
    expect(error.code).toBe(ErrorCode.DAILY_QUOTA_EXCEEDED);
    expect(error.statusCode).toBe(429);
    expect(error.isRetryable).toBe(false);
    expect(error.details).toEqual({
      resetsAt: resetTime.toISOString(),
    });
  });

  it('should calculate hours until reset correctly', () => {
    const now = new Date('2025-01-01T12:00:00Z');
    const tomorrow = new Date('2025-01-02T12:00:00Z');

    // Mock Date.now() for testing
    const originalNow = Date.now;
    Date.now = () => now.getTime();

    const error = new QuotaError(tomorrow);

    expect(error.userMessage).toContain('24 hours');

    Date.now = originalNow;
  });

  it('should handle partial hours correctly', () => {
    const now = new Date('2025-01-01T12:00:00Z');
    const resetTime = new Date('2025-01-01T18:30:00Z');

    const originalNow = Date.now;
    Date.now = () => now.getTime();

    const error = new QuotaError(resetTime);

    expect(error.userMessage).toContain('7 hours'); // Ceiled from 6.5

    Date.now = originalNow;
  });
});

describe('ValidationError', () => {
  it('should create validation error for field', () => {
    const error = new ValidationError('username');

    expect(error.name).toBe('ValidationError');
    expect(error.code).toBe(ErrorCode.INVALID_INPUT);
    expect(error.statusCode).toBe(400);
    expect(error.isRetryable).toBe(false);
    expect(error.details).toEqual({ field: 'username' });
  });

  it('should include field name in default user message', () => {
    const error = new ValidationError('email');

    expect(error.userMessage).toContain('email');
  });

  it('should use custom user message when provided', () => {
    const customMessage = 'Email must be a valid address';
    const error = new ValidationError('email', customMessage);

    expect(error.userMessage).toBe(customMessage);
  });

  it('should include field in technical message', () => {
    const error = new ValidationError('password');

    expect(error.message).toContain('password');
  });
});

describe('RAGError', () => {
  it('should create RAG error with user message', () => {
    const error = new RAGError('Search service unavailable');

    expect(error.name).toBe('RAGError');
    expect(error.code).toBe(ErrorCode.RAG_SEARCH_FAILED);
    expect(error.userMessage).toBe('Search service unavailable');
    expect(error.statusCode).toBe(500);
  });

  it('should default isRetryable to false', () => {
    const error = new RAGError('Search failed');

    expect(error.isRetryable).toBe(false);
  });

  it('should allow isRetryable to be set', () => {
    const error = new RAGError('Temporary search failure', true);

    expect(error.isRetryable).toBe(true);
  });
});

describe('toUserError', () => {
  it('should return AppError as-is', () => {
    const originalError = new ValidationError('test');
    const result = toUserError(originalError);

    expect(result).toBe(originalError);
  });

  it('should convert generic Error to AppError', () => {
    const genericError = new Error('Something went wrong');
    const result = toUserError(genericError);

    expect(result).toBeInstanceOf(AppError);
    expect(result.statusCode).toBe(500);
    expect(result.isRetryable).toBe(true);
  });

  it('should detect quota/rate limit errors from message', () => {
    const quotaError = new Error('API quota exceeded');
    const result = toUserError(quotaError);

    expect(result).toBeInstanceOf(QuotaError);
    expect(result.code).toBe(ErrorCode.DAILY_QUOTA_EXCEEDED);
  });

  it('should detect 429 status from error message', () => {
    const rateLimitError = new Error('HTTP 429: Too many requests');
    const result = toUserError(rateLimitError);

    expect(result).toBeInstanceOf(QuotaError);
  });

  it('should detect timeout errors', () => {
    const timeoutError = new Error('Request timed out after 30s');
    const result = toUserError(timeoutError);

    expect(result).toBeInstanceOf(AIError);
    expect(result.code).toBe(ErrorCode.AI_TIMEOUT);
    expect(result.isRetryable).toBe(true);
  });

  it('should detect connection errors', () => {
    const connectionError = new Error('fetch failed');
    const result = toUserError(connectionError);

    expect(result).toBeInstanceOf(AIError);
    expect(result.code).toBe(ErrorCode.AI_UNAVAILABLE);
    expect(result.isRetryable).toBe(true);
  });

  it('should detect network errors', () => {
    const networkError = new Error('network error occurred');
    const result = toUserError(networkError);

    expect(result).toBeInstanceOf(AIError);
    expect(result.userMessage).toContain('network');
  });

  it('should convert string error to AppError', () => {
    const stringError = 'Custom error message';
    const result = toUserError(stringError);

    expect(result).toBeInstanceOf(AppError);
    expect(result.message).toBe(stringError);
  });

  it('should convert unknown error to AppError', () => {
    const unknownError = { foo: 'bar' };
    const result = toUserError(unknownError);

    expect(result).toBeInstanceOf(AppError);
    expect(result.message).toBe('Unknown error');
  });

  it('should handle null error', () => {
    const result = toUserError(null);

    expect(result).toBeInstanceOf(AppError);
  });

  it('should handle undefined error', () => {
    const result = toUserError(undefined);

    expect(result).toBeInstanceOf(AppError);
  });
});

describe('logError', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('should log AppError properties', () => {
    const error = new ValidationError('test');
    const consoleSpy = vi.spyOn(console, 'error');

    logError(error);

    expect(consoleSpy).toHaveBeenCalledWith('=== Application Error ===');
    expect(consoleSpy).toHaveBeenCalledWith('Code:', error.code);
    expect(consoleSpy).toHaveBeenCalledWith('Message:', error.message);
    expect(consoleSpy).toHaveBeenCalledWith('User Message:', error.userMessage);
    expect(consoleSpy).toHaveBeenCalledWith('Status:', error.statusCode);
    expect(consoleSpy).toHaveBeenCalledWith('Retryable:', error.isRetryable);
  });

  it('should log context when provided', () => {
    const error = new ValidationError('test');
    const consoleSpy = vi.spyOn(console, 'error');
    const context = { userId: '123', action: 'chat' };

    logError(error, context);

    expect(consoleSpy).toHaveBeenCalledWith('Context:', context);
  });

  it('should log details when present', () => {
    const error = new AIError(
      ErrorCode.AI_TIMEOUT,
      'Timeout',
      true,
      { attempt: 3, maxAttempts: 5 }
    );
    const consoleSpy = vi.spyOn(console, 'error');

    logError(error);

    expect(consoleSpy).toHaveBeenCalledWith('Details:', error.details);
  });

  it('should convert non-AppError to AppError before logging', () => {
    const genericError = new Error('Generic error');
    const consoleSpy = vi.spyOn(console, 'error');

    logError(genericError);

    expect(consoleSpy).toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Code:')
    );
  });
});

describe('errorToResponse', () => {
  it('should create NextResponse from AppError', async () => {
    const error = new ValidationError('username');
    const response = errorToResponse(error);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json).toEqual({
      code: ErrorCode.INVALID_INPUT,
      message: error.userMessage,
      retryable: false,
      details: { field: 'username' },
    });
  });

  it('should create NextResponse from generic Error', async () => {
    const genericError = new Error('Generic error');
    const response = errorToResponse(genericError);
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(json).toHaveProperty('code');
    expect(json).toHaveProperty('message');
  });

  it('should set correct status code for rate limit errors', async () => {
    const error = new RateLimitError(60);
    const response = errorToResponse(error);

    expect(response.status).toBe(429);
  });

  it('should set correct status code for quota errors', async () => {
    const resetTime = new Date(Date.now() + 86400000);
    const error = new QuotaError(resetTime);
    const response = errorToResponse(error);

    expect(response.status).toBe(429);
  });

  it('should set correct status code for validation errors', async () => {
    const error = new ValidationError('email');
    const response = errorToResponse(error);

    expect(response.status).toBe(400);
  });

  it('should include JSON content type header', async () => {
    const error = new AppError(ErrorCode.AI_UNAVAILABLE, 'Message', 'User message');
    const response = errorToResponse(error);

    expect(response.headers.get('content-type')).toContain('application/json');
  });
});
