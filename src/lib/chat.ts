/**
 * Chat Utility Functions
 * AI Math Tutor v2
 *
 * Helper functions for chat session management and formatting.
 */

import { ChatSession, Message, QuizSummaryData } from '@/types';
import type { QuizQuestion } from '@/types';

/**
 * Generate a session title from the first user message
 * Truncates to ~50 characters with ellipsis if needed
 *
 * @param firstMessage - The first user message content
 * @returns A suitable session title
 */
export function generateSessionTitle(firstMessage: string): string {
  // Clean the message
  let title = firstMessage.trim();

  // Remove line breaks
  title = title.replace(/\n+/g, ' ');

  // Remove multiple spaces
  title = title.replace(/\s+/g, ' ');

  // Truncate to 50 characters
  if (title.length > 50) {
    title = title.slice(0, 47) + '...';
  }

  // Fallback if empty
  if (!title) {
    title = 'New Chat';
  }

  return title;
}

/**
 * Update a session's title based on its first user message
 * Only updates if the title is still the default "New Chat"
 *
 * @param session - The chat session to update
 * @returns The updated session
 */
export function updateSessionTitleFromFirstMessage(
  session: ChatSession
): ChatSession {
  const firstUserMessage = session.messages.find(m => m.role === 'user');

  if (firstUserMessage && session.title === 'New Chat') {
    session.title = generateSessionTitle(firstUserMessage.content);
  }

  return session;
}

/**
 * Format a timestamp for display
 *
 * @param isoString - ISO 8601 timestamp string
 * @returns Formatted date/time string
 */
export function formatTimestamp(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  // Within the last minute
  if (diffMins < 1) {
    return 'Just now';
  }

  // Within the last hour
  if (diffMins < 60) {
    return `${diffMins}m ago`;
  }

  // Within the last day
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  // Within the last week
  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }

  // Older - show date
  return date.toLocaleDateString('en-SG', {
    day: 'numeric',
    month: 'short',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

/**
 * Truncate text with ellipsis
 *
 * @param text - Text to truncate
 * @param maxLength - Maximum length including ellipsis
 * @returns Truncated text
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Create a new message object
 *
 * @param role - Message role ('user' or 'assistant')
 * @param content - Message content
 * @param imageUrl - Optional image URL (base64 data URL)
 * @returns New Message object
 */
export function createMessage(
  role: 'user' | 'assistant',
  content: string,
  imageUrl?: string
): Message {
  return {
    id: crypto.randomUUID(),
    role,
    content,
    imageUrl,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Create a quiz summary message
 *
 * @param summaryData - Quiz summary data
 * @returns New quiz summary message
 */
export function createQuizSummaryMessage(summaryData: QuizSummaryData): Message {
  const { score, totalQuestions, percentage, timeTaken, retryAttempt, config } = summaryData;
  const retryLabel = retryAttempt > 0 ? `🔄 Retry #${retryAttempt}: ` : '';

  return {
    id: crypto.randomUUID(),
    role: 'quiz_summary',
    content: `${retryLabel}Quiz Complete! Score: ${score}/${totalQuestions} (${percentage}%) • Time: ${timeTaken} • ${config.level} ${config.difficulty === 'all' ? 'medium' : config.difficulty}`,
    timestamp: new Date().toISOString(),
    quizSummary: summaryData,
  };
}


/**
 * Validate image file for upload
 *
 * @param file - File to validate
 * @returns Object with valid status and optional error message
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  const maxSize = 10 * 1024 * 1024; // 10MB

  if (!validTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Please upload a JPEG, PNG, GIF, or WebP image.',
    };
  }

  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'Image must be under 10MB.',
    };
  }

  return { valid: true };
}

/**
 * Convert a File to base64 data URL
 *
 * @param file - File to convert
 * @returns Promise resolving to base64 data URL
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to read file'));
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
