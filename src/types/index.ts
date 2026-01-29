// AI Math Tutor v2 - Type Definitions

// Import quiz types for use in this file
import type { QuizQuestion } from './quiz';

// Re-export quiz types for convenience
export * from './quiz';
export type { QuizQuestion } from './quiz';

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
export type MessageRole = 'user' | 'assistant' | 'quiz_summary';

/**
 * Quiz summary data for quiz summary messages
 */
export interface QuizSummaryData {
  /** Quiz configuration */
  config: {
    level: 'P1' | 'P2' | 'P3' | 'P4' | 'P5' | 'P6';
    topics: string[];
    difficulty: 'easy' | 'medium' | 'hard' | 'all';
    questionCount: 5 | 10 | 15 | 20;
  };
  /** Number of correct answers */
  score: number;
  /** Total questions */
  totalQuestions: string;
  /** Percentage score */
  percentage: number;
  /** Time taken to complete */
  timeTaken: string;
  /** Retry attempt number (0 for first attempt, 1 for first retry, etc.) */
  retryAttempt: number;
  /** Whether this is a retry */
  isRetry: boolean;
  /** Questions for review */
  questions: QuizQuestion[];
  /** User's answers */
  answers: Array<{
    selected: 'A' | 'B' | 'C' | 'D' | null;
    isCorrect: boolean;
    answeredAt: string;
  }>;
  /** When quiz was completed */
  completedAt: string;
  /** When quiz was started */
  startedAt: string;
}

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
  /** Quiz summary data (only present for quiz_summary messages) */
  quizSummary?: QuizSummaryData;
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
 * Active quiz state within a chat session
 */
export interface ChatQuizState {
  /** Unique quiz identifier */
  id: string;
  /** Quiz configuration */
  config: {
    level: 'P1' | 'P2' | 'P3' | 'P4' | 'P5' | 'P6';
    topics: string[];
    difficulty: 'easy' | 'medium' | 'hard' | 'all';
    questionCount: 5 | 10 | 15 | 20;
  };
  /** Questions in the quiz */
  questions: QuizQuestion[];
  /** User's answers (indexed by question position) */
  answers: Array<{
    selected: 'A' | 'B' | 'C' | 'D' | null;
    isCorrect: boolean;
    answeredAt: string;
  }>;
  /** Current question index (0-based) */
  currentIndex: number;
  /** Whether feedback is shown for current question */
  showFeedback: boolean;
  /** ISO 8601 timestamp when quiz started */
  startedAt: string;
  /** Whether quiz is completed */
  isCompleted: boolean;
}

/**
 * Chat session with optional embedded quiz
 */
export interface ChatSessionWithQuiz extends ChatSession {
  /** Active quiz in this session (optional) */
  activeQuiz?: ChatQuizState;
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
  QUIZ_IN_CHAT: 'math-tutor-quiz-in-chat',
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
