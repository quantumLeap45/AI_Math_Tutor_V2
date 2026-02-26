/**
 * Quiz Feature Type Definitions
 * AI Math Tutor v2
 *
 * Type-safe definitions for the quiz feature including questions,
 * sessions, results, and progress tracking.
 */

/**
 * Primary levels supported by the quiz
 */
export type PrimaryLevel = 'P1' | 'P2' | 'P3' | 'P4' | 'P5' | 'P6';

/**
 * Difficulty levels for quiz questions
 */
export type QuizDifficulty = 'easy' | 'medium' | 'hard';

/**
 * Multiple choice option keys
 */
export type QuizOption = 'A' | 'B' | 'C' | 'D';

/**
 * Quiz topics available (based on MOE syllabus)
 * Includes topics for both P1 and P2
 */
export type QuizTopic =
  | 'Whole Numbers'
  | 'Addition and Subtraction'
  | 'Multiplication and Division'
  | 'Money'
  | 'Time'
  | 'Length'
  | 'Mass'
  | 'Fractions'
  | 'Shapes'
  | 'Picture Graphs'
  | 'Length/Mass/Volume'
  | 'Area and Perimeter'
  | 'Bar Graphs';

/**
 * Available question counts for a quiz session
 */
export type QuizQuestionCount = number;

/**
 * Quiz question count limits
 */
export const QUIZ_QUESTION_COUNT_MIN = 1;
export const QUIZ_QUESTION_COUNT_MAX = 25;

/**
 * Quiz session states
 */
export type QuizState = 'home' | 'setup' | 'in_progress' | 'completed' | 'abandoned';

/**
 * Performance rating based on score
 */
export type PerformanceRating = 'excellent' | 'good' | 'fair' | 'needs_practice';

// ============ QUESTION TYPES ============

/**
 * Multiple choice options for a quiz question
 */
export interface QuizOptions {
  /** Option A */
  A: string;
  /** Option B */
  B: string;
  /** Option C */
  C: string;
  /** Option D */
  D: string;
}

/**
 * A single quiz question
 */
export interface QuizQuestion {
  /** Unique identifier (e.g., "P1-WHOLE-001") */
  id: string;
  /** Primary level */
  level: PrimaryLevel;
  /** Topic area */
  topic: string;
  /** Specific subtopic */
  subtopic: string;
  /** Difficulty level */
  difficulty: QuizDifficulty;
  /** Question text */
  question: string;
  /** Multiple choice options */
  options: QuizOptions;
  /** Correct answer key */
  correctAnswer: QuizOption;
  /** Explanation of the correct answer */
  explanation: string;
  /** Optional image URL for visual questions (e.g., charts, diagrams) */
  imageUrl?: string;
  /** Alt text describing the image for accessibility */
  imageAlt?: string;
  /**
   * Template group identifier — questions sharing the same story/structure
   * have the same template_id even when numbers differ. Used by the quiz
   * engine to enforce template diversity within and across quiz sessions.
   */
  templateId?: string;
}

// ============ QUIZ CONFIGURATION ============

/**
 * Configuration for starting a new quiz
 */
export interface QuizConfig {
  /** Primary level */
  level: PrimaryLevel;
  /** Topics to include (empty array = all topics) */
  topics: string[];
  /** Optional difficulty filter */
  difficulty?: QuizDifficulty | 'all';
  /** Number of questions */
  questionCount: QuizQuestionCount;
}

// ============ QUIZ ANSWER & SESSION ============

/**
 * A user's answer to a single question
 */
export interface QuizAnswer {
  /** Question ID */
  questionId: string;
  /** Selected option (null if skipped) */
  selected: QuizOption | null;
  /** Whether the answer was correct */
  isCorrect: boolean;
  /** Time taken to answer in milliseconds */
  timeTaken: number;
  /** ISO 8601 timestamp when answered */
  answeredAt: string;
}

/**
 * A complete quiz attempt/session
 */
export interface QuizAttempt {
  /** Unique attempt identifier (UUID v4) */
  id: string;
  /** Quiz configuration used */
  config: QuizConfig;
  /** Questions in this quiz */
  questions: QuizQuestion[];
  /** User's answers (indexed by question position) */
  answers: QuizAnswer[];
  /** Current question index (0-based) */
  currentIndex: number;
  /** Current session state */
  state: QuizState;
  /** Final score percentage (0-100) */
  score?: number;
  /** Number of correct answers */
  correctCount?: number;
  /** ISO 8601 timestamp when quiz started */
  startedAt: string;
  /** ISO 8601 timestamp when quiz completed */
  completedAt?: string;
  /** Total time taken in milliseconds */
  totalTime?: number;
  /** ISO 8601 timestamp of last auto-save */
  lastSavedAt?: string;
  /** Accumulated time in seconds (for pause/resume) */
  accumulatedTime?: number;
}

// ============ QUIZ RESULT TYPES ============

/**
 * Performance breakdown for a specific topic
 */
export interface TopicPerformance {
  /** Topic name */
  topic: string;
  /** Number of questions attempted */
  attempted: number;
  /** Number of correct answers */
  correct: number;
  /** Accuracy percentage (0-100) */
  accuracy: number;
}

/**
 * Final quiz result summary
 */
export interface QuizResult {
  /** Attempt ID */
  attemptId: string;
  /** Score percentage (0-100) */
  score: number;
  /** Number of correct answers */
  correctCount: number;
  /** Total number of questions */
  totalQuestions: number;
  /** Total time taken in milliseconds */
  totalTime: number;
  /** Performance breakdown by topic */
  topicBreakdown: TopicPerformance[];
  /** Performance rating */
  rating: PerformanceRating;
  /** ISO 8601 timestamp when completed */
  completedAt: string;
}

// ============ PROGRESS TRACKING ============

/**
 * Progress statistics for a specific level
 */
export interface LevelProgress {
  /** Level identifier */
  level: PrimaryLevel;
  /** Number of quizzes completed */
  quizzesCompleted: number;
  /** Total questions answered */
  questionsAnswered: number;
  /** Average score percentage */
  averageScore: number;
  /** Topics with 80%+ accuracy */
  masteredTopics: string[];
  /** Topics with <60% accuracy */
  needsPractice: string[];
}

/**
 * Type alias for level progress record
 */
export type LevelProgressRecord = Record<PrimaryLevel, LevelProgress>;

/**
 * Overall quiz progress tracking
 */
export interface QuizProgress {
  /** Total number of quizzes completed */
  totalQuizzes: number;
  /** Total questions answered across all quizzes */
  totalQuestions: number;
  /** Overall accuracy percentage */
  overallAccuracy: number;
  /** Best score achieved */
  bestScore: number;
  /** Current streak of correct answers */
  currentStreak: number;
  /** Progress breakdown by level */
  byLevel: LevelProgressRecord;
  /** Topics with <60% accuracy (need practice) */
  weakAreas: string[];
  /** ISO 8601 timestamp of last update */
  lastUpdated: string;
}

// ============ QUIZ METADATA ============

/**
 * Lightweight metadata for quiz display (without full questions)
 * Used for in-progress quiz cards and resume functionality
 */
export interface QuizMetadata {
  /** Unique attempt identifier */
  id: string;
  /** Quiz configuration used */
  config: QuizConfig;
  /** Current question index (0-based) */
  currentIndex: number;
  /** Total number of questions */
  totalQuestions: number;
  /** ISO 8601 timestamp when quiz started */
  startedAt: string;
  /** ISO 8601 timestamp of last save */
  lastSavedAt: string;
}

// ============ STORAGE KEYS ============

/**
 * localStorage keys for quiz-related data
 */
export const QUIZ_STORAGE_KEYS = {
  /** Array of completed quiz attempts */
  ATTEMPTS: 'math-tutor-quiz-attempts',
  /** Overall progress statistics */
  PROGRESS: 'math-tutor-quiz-progress',
  /** Current active quiz session (legacy, kept for compatibility) */
  CURRENT: 'math-tutor-quiz-current',
  /** Array of in-progress quiz attempts (max 5) */
  IN_PROGRESS: 'math-tutor-quiz-in-progress',
  /**
   * Template cooldown history per level.
   * Tracks which template groups appeared in the last N quizzes so the
   * engine can deprioritise them in the next session.
   */
  TEMPLATE_COOLDOWN: 'math-tutor-template-cooldown',
} as const;

// ============ STORAGE LIMITS ============

/**
 * Storage limits for quiz data
 */
export const QUIZ_STORAGE_LIMITS = {
  /** Maximum number of quiz attempts to store */
  MAX_ATTEMPTS: 50,
  /** Maximum number of weak areas to track */
  MAX_WEAK_AREAS: 10,
  /** Maximum number of in-progress quizzes to store */
  MAX_IN_PROGRESS: 50,
} as const;

// ============ CONSTANTS ============

/**
 * Performance rating thresholds
 */
export const RATING_THRESHOLDS = {
  /** Score >= 90 is excellent */
  EXCELLENT: 90,
  /** Score >= 70 is good */
  GOOD: 70,
  /** Score >= 50 is fair */
  FAIR: 50,
  /** Below 50 needs practice */
  NEEDS_PRACTICE: 50,
} as const;

/**
 * Default quiz configuration
 */
export const DEFAULT_QUIZ_CONFIG: QuizConfig = {
  level: 'P1',
  topics: [],
  difficulty: 'all',
  questionCount: 10,
} as const;

/**
 * All available topics for P1
 */
export const P1_TOPICS: QuizTopic[] = [
  'Whole Numbers',
  'Addition and Subtraction',
  'Multiplication and Division',
  'Money',
  'Time',
  'Picture Graphs',
] as const;

/**
 * All available topics for P2
 */
export const P2_TOPICS: QuizTopic[] = [
  'Whole Numbers',
  'Addition and Subtraction',
  'Multiplication and Division',
  'Length',
  'Mass',
  'Time',
  'Money',
  'Fractions',
  'Shapes',
  'Picture Graphs',
] as const;

/**
 * All available topics for P3
 */
export const P3_TOPICS: QuizTopic[] = [
  'Whole Numbers',
  'Addition and Subtraction',
  'Multiplication and Division',
  'Money',
  'Time',
  'Fractions',
  'Length/Mass/Volume',
  'Area and Perimeter',
  'Bar Graphs',
] as const;

/**
 * Available difficulty levels for filtering
 */
export const DIFFICULTY_OPTIONS = ['easy', 'medium', 'hard', 'all'] as const;

/**
 * Available question counts
 */
export const QUESTION_COUNT_OPTIONS: QuizQuestionCount[] = [5, 10, 15, 20, 25] as const;

// ============ UTILITY TYPES ============

/**
 * Calculate performance rating from score
 */
export function getPerformanceRating(score: number): PerformanceRating {
  if (score >= RATING_THRESHOLDS.EXCELLENT) return 'excellent';
  if (score >= RATING_THRESHOLDS.GOOD) return 'good';
  if (score >= RATING_THRESHOLDS.FAIR) return 'fair';
  return 'needs_practice';
}

/**
 * Format time duration in human-readable form
 * Shows MM:SS for durations < 1 hour, HH:MM:SS for 1+ hours
 */
export function formatDuration(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  // Format with leading zeros
  const pad = (num: number) => num.toString().padStart(2, '0');

  if (hours > 0) {
    return `${pad(hours)}:${pad(remainingMinutes)}:${pad(remainingSeconds)}`;
  }
  return `${pad(remainingMinutes)}:${pad(remainingSeconds)}`;
}
