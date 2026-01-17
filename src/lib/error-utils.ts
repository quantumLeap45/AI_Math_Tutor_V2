/**
 * Error Utility Functions
 * AI Math Tutor v2
 *
 * Shared error handling utilities for consistent error messaging
 * across the application.
 */

/**
 * Convert API errors to user-friendly messages
 * Detects common error patterns and returns clean, actionable messages
 *
 * @param error - The error object from the API
 * @returns A user-friendly error message
 */
export function getUserFriendlyErrorMessage(error: unknown): string {
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
