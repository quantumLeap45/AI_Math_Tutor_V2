// AI Math Tutor v2 - Type Definitions

// Re-export quiz types for convenience
export * from './quiz';

/**
 * Tutor mode for AI responses
 * - SHOW: Direct instruction - provides complete solutions
 * - TEACH: Socratic guidance - guides student to discover answers
 */
export type TutorMode = 'SHOW' | 'TEACH';

/**
 * Theme preference
 */
export type Theme = 'light' | 'dark';

/**
 * Message role in a conversation
 */
export type MessageRole = 'user' | 'assistant';

/**
 * A single message in a chat session
 */
export interface Message {
  /** Unique identifier (UUID v4) */
  id: string;
  /** Who sent the message */
  role: MessageRole;
  /** Message content (supports Markdown) */
  content: string;
  /** Optional image as base64 data URL */
  imageUrl?: string;
  /** ISO 8601 timestamp when message was created */
  timestamp: string;
}

/**
 * A chat session containing conversation history
 */
export interface ChatSession {
  /** Unique identifier (UUID v4) */
  id: string;
  /** Session title (auto-generated from first user message, max 100 chars) */
  title: string;
  /** Current tutor mode for this session */
  mode: TutorMode;
  /** Array of messages in this session */
  messages: Message[];
  /** ISO 8601 timestamp when session was created */
  createdAt: string;
  /** ISO 8601 timestamp when session was last updated */
  updatedAt: string;
}

/**
 * User settings stored in localStorage
 */
export interface UserSettings {
  /** UI theme preference */
  theme: Theme;
  /** Default tutor mode for new sessions */
  defaultMode: TutorMode;
  /** Whether sidebar is collapsed on desktop */
  sidebarCollapsed: boolean;
  /** ID of the last active session */
  lastActiveSession?: string;
}

/**
 * API request payload for chat endpoint
 */
export interface ChatRequest {
  /** Array of messages in the conversation */
  messages: Message[];
  /** Current tutor mode */
  mode: TutorMode;
  /** Optional image as base64 string (without data URL prefix) */
  image?: string;
}

/**
 * API response for chat endpoint (streamed)
 */
export interface ChatResponse {
  /** Response text content */
  content: string;
  /** Whether this is the final chunk */
  done: boolean;
}

/**
 * Error response from API
 */
export interface ApiError {
  /** Error message */
  error: string;
  /** HTTP status code */
  status?: number;
}

/**
 * localStorage key constants
 */
export const STORAGE_KEYS = {
  USERNAME: 'math-tutor-username',
  SESSIONS: 'math-tutor-sessions',
  SETTINGS: 'math-tutor-settings',
  VERSION: 'math-tutor-version',
} as const;

/**
 * Default user settings
 */
export const DEFAULT_SETTINGS: UserSettings = {
  theme: 'light',
  defaultMode: 'SHOW',
  sidebarCollapsed: false,
};

/**
 * Storage version for migrations
 */
export const CURRENT_VERSION = '1.0.0';

/**
 * Storage limits
 */
export const STORAGE_LIMITS = {
  MAX_SESSIONS: 50,
  MAX_MESSAGES_PER_SESSION: 100,
  MAX_TITLE_LENGTH: 100,
  MAX_USERNAME_LENGTH: 30,
  MIN_USERNAME_LENGTH: 2,
} as const;
