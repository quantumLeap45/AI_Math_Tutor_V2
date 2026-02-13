/**
 * Standardized Error Handling
 * AI Math Tutor V2
 *
 * Enterprise-grade error handling with specific error codes
 * and user-friendly messages based on production LLM application patterns.
 */

/**
 * Error codes for categorization and logging
 */
export enum ErrorCode {
  // Configuration Errors
  CONFIG_MISSING = 'CONFIG_MISSING',
  CONFIG_INVALID = 'CONFIG_INVALID',

  // AI Provider Errors
  AI_UNAVAILABLE = 'AI_UNAVAILABLE',
  AI_QUOTA_EXCEEDED = 'AI_QUOTA_EXCEEDED',
  AI_TIMEOUT = 'AI_TIMEOUT',
  AI_STREAM_ERROR = 'AI_STREAM_ERROR',

  // Database Errors
  DB_CONNECTION_FAILED = 'DB_CONNECTION_FAILED',
  DB_QUERY_FAILED = 'DB_QUERY_FAILED',

  // Rate Limiting
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  DAILY_QUOTA_EXCEEDED = 'DAILY_QUOTA_EXCEEDED',

  // Input Validation
  INVALID_INPUT = 'INVALID_INPUT',
  INVALID_IMAGE = 'INVALID_IMAGE',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',

  // RAG Errors
  RAG_SEARCH_FAILED = 'RAG_SEARCH_FAILED',
  RAG_NOT_CONFIGURED = 'RAG_NOT_CONFIGURED',

  // File/Storage Errors
  STORAGE_QUOTA_EXCEEDED = 'STORAGE_QUOTA_EXCEEDED',
  STORAGE_UNAVAILABLE = 'STORAGE_UNAVAILABLE',

  // Blob Storage Errors
  BLOB_UPLOAD_FAILED = 'BLOB_UPLOAD_FAILED',
  BLOB_DELETE_FAILED = 'BLOB_DELETE_FAILED',
  BLOB_NOT_CONFIGURED = 'BLOB_NOT_CONFIGURED',
}

/**
 * Base application error class
 */
export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public userMessage: string,
    public statusCode: number = 500,
    public isRetryable: boolean = false,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
  }

  toJSON() {
    return {
      code: this.code,
      message: this.userMessage,
      retryable: this.isRetryable,
      ...(this.details && { details: this.details }),
    };
  }
}

/**
 * AI-related errors
 */
export class AIError extends AppError {
  constructor(code: ErrorCode, userMessage: string, isRetryable = false, details?: Record<string, unknown>) {
    super(code, `AI Error: ${code}`, userMessage, 500, isRetryable, details);
    this.name = 'AIError';
  }
}

/**
 * Configuration errors
 */
export class ConfigError extends AppError {
  constructor(message: string) {
    super(
      ErrorCode.CONFIG_MISSING,
      `Configuration error: ${message}`,
      'Application configuration is incomplete. Please contact support.',
      500,
      false
    );
    this.name = 'ConfigError';
  }
}

/**
 * Rate limit errors
 */
export class RateLimitError extends AppError {
  constructor(retryAfter?: number) {
    super(
      ErrorCode.RATE_LIMIT_EXCEEDED,
      'Rate limit exceeded',
      `Too many requests. Please wait ${retryAfter || 'a few'} seconds.`,
      429,
      true,
      { retryAfter }
    );
    this.name = 'RateLimitError';
  }
}

/**
 * Daily quota errors
 */
export class QuotaError extends AppError {
  constructor(resetsAt: Date) {
    const hoursUntilReset = Math.ceil((resetsAt.getTime() - Date.now()) / (1000 * 60 * 60));
    super(
      ErrorCode.DAILY_QUOTA_EXCEEDED,
      'Daily quota exceeded',
      `Daily limit reached. Please wait ${hoursUntilReset} hours or try again tomorrow.`,
      429,
      false,
      { resetsAt: resetsAt.toISOString() }
    );
    this.name = 'QuotaError';
  }
}

/**
 * Input validation errors
 */
export class ValidationError extends AppError {
  constructor(field: string, userMessage?: string) {
    super(
      ErrorCode.INVALID_INPUT,
      `Validation failed for field: ${field}`,
      userMessage || `Invalid value for ${field}. Please check and try again.`,
      400,
      false,
      { field }
    );
    this.name = 'ValidationError';
  }
}

/**
 * RAG-related errors
 */
export class RAGError extends AppError {
  constructor(userMessage: string, isRetryable = false) {
    super(
      ErrorCode.RAG_SEARCH_FAILED,
      'RAG search failed',
      userMessage,
      500,
      isRetryable
    );
    this.name = 'RAGError';
  }
}

/**
 * Convert any error to user-friendly format
 */
export function toUserError(error: unknown): AppError {
  // Already an AppError
  if (error instanceof AppError) {
    return error;
  }

  // Standard Error
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();

    // Check for quota/rate limit patterns
    if (
      msg.includes('quota') ||
      msg.includes('limit') ||
      msg.includes('exceeded') ||
      msg.includes('429')
    ) {
      return new QuotaError(new Date(Date.now() + 86400000));
    }

    // Check for timeout patterns
    if (msg.includes('timeout') || msg.includes('timed out')) {
      return new AIError(ErrorCode.AI_TIMEOUT, 'Request timed out. Please try again.', true);
    }

    // Check for connection errors
    if (msg.includes('fetch failed') || msg.includes('network')) {
      return new AIError(ErrorCode.AI_UNAVAILABLE, 'Network error. Please check your connection and try again.', true);
    }

    // Generic error
    return new AppError(
      ErrorCode.INVALID_INPUT,
      error.message,
      'Something went wrong. Please try again.',
      500,
      true
    );
  }

  // String or unknown type
  if (typeof error === 'string') {
    return new AppError(
      ErrorCode.INVALID_INPUT,
      error,
      'Something went wrong. Please try again.',
      500,
      true
    );
  }

  // Completely unknown error type
  return new AppError(
    ErrorCode.INVALID_INPUT,
    'Unknown error',
    'Something went wrong. Please try again.',
    500,
    true
  );
}

/**
 * Log error with context
 */
export function logError(error: unknown, context?: Record<string, unknown>): void {
  const appError = error instanceof AppError ? error : toUserError(error);

  console.error('=== Application Error ===');
  console.error(`Code: ${appError.code}`);
  console.error(`Message: ${appError.message}`);
  console.error(`User Message: ${appError.userMessage}`);
  console.error(`Status: ${appError.statusCode}`);
  console.error(`Retryable: ${appError.isRetryable}`);
  if (context) {
    console.error('Context:', context);
  }
  if (appError.details) {
    console.error('Details:', appError.details);
  }
}

/**
 * Create NextResponse from error
 */
import { NextResponse } from 'next/server';

export function errorToResponse(error: unknown): NextResponse {
  const appError = toUserError(error);

  return NextResponse.json(appError.toJSON(), {
    status: appError.statusCode,
  });
}
