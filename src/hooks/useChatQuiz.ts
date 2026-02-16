/**
 * useChatQuiz Hook
 * AI Math Tutor v2
 *
 * Hook for managing quiz state within chat sessions.
 * Handles quiz generation, answer tracking, feedback display,
 * and persistence for the chat-embedded quiz feature.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { ChatQuizState, QuizQuestion, QuizOption, DEFAULT_QUIZ_CONFIG } from '@/types';
import { saveChatQuizState, getChatQuizState, clearChatQuizState } from '@/lib/storage';

// ============ TYPES ============

interface UseChatQuizOptions {
  /** Chat session ID for persistence */
  sessionId: string;
}

interface UseChatQuizState {
  /** Current quiz state */
  quiz: ChatQuizState | null;
  /** Whether a quiz is loading */
  isLoading: boolean;
  /** Error message if quiz generation failed */
  error: string | null;
  /** Current question */
  currentQuestion: QuizQuestion | null;
  /** Last active question — persists after quiz completion for follow-up chat context */
  lastActiveQuestion: QuizQuestion | null;
  /** Completed quizzes for review (stored in memory) */
  completedQuizzes: Array<ChatQuizState & { timeTaken: string; score: number; correctCount: number; completedAt: string }>;
  /** Last completed quiz available for retry (with retry count) */
  lastCompletedQuiz: (ChatQuizState & { timeTaken: string; score: number; correctCount: number; completedAt: string; retryAttempt: number }) | null;
  /** Last failed quiz config for retry on generation failure */
  lastFailedConfig: ChatQuizState['config'] | null;
}

interface UseChatQuizActions {
  /** Start a new quiz with the given configuration */
  startQuiz: (config?: Partial<ChatQuizState['config']>) => Promise<void>;
  /** Retry the last completed quiz with same questions */
  retryQuiz: () => void;
  /** Retry a failed quiz generation with the last config */
  retryFailedQuiz: () => Promise<void>;
  /** Select an answer option for the current question */
  selectOption: (option: 'A' | 'B' | 'C' | 'D') => void;
  /** Submit the current answer and show feedback */
  submitAnswer: () => void;
  /** Move to the next question */
  nextQuestion: () => void;
  /** Go back to the previous question */
  previousQuestion: () => void;
  /** Clear the current error */
  clearError: () => void;
  /** Exit and clear quiz state */
  exitQuiz: () => void;
  /** Clear the last active question context (used when toggling quiz mode off) */
  clearLastActiveQuestion: () => void;
  /** Abort any in-flight quiz generation request */
  abortQuizGeneration: () => void;
}

// ============ HELPER FUNCTIONS ============

/**
 * Create initial quiz state from configuration
 */
function createInitialQuizState(
  questions: QuizQuestion[],
  config: ChatQuizState['config']
): ChatQuizState {
  return {
    id: crypto.randomUUID(),
    config,
    questions,
    answers: questions.map(() => ({
      selected: null,
      isCorrect: false,
      answeredAt: '',
    })),
    currentIndex: 0,
    showFeedback: false,
    startedAt: new Date().toISOString(),
    isCompleted: false,
  };
}

/**
 * Generate quiz questions from the API
 * Shared by startQuiz and retryFailedQuiz to avoid code duplication.
 */
async function generateQuizFromAPI(config: ChatQuizState['config'], signal?: AbortSignal): Promise<QuizQuestion[]> {
  const response = await fetch('/api/v1/quiz/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      topics: config.topics.length > 0 ? config.topics : ['math'],
      level: config.level,
      questionCount: config.questionCount,
      difficulty: config.difficulty,
    }),
    signal,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || errorData.error || 'Failed to generate quiz');
  }

  const data = await response.json();

  if (!data.questions || data.questions.length === 0) {
    throw new Error('No questions generated');
  }

  return data.questions;
}

/**
 * Calculate quiz score
 */
function calculateScore(quiz: ChatQuizState): number {
  if (quiz.answers.length === 0) return 0;
  const correct = quiz.answers.filter(a => a.isCorrect).length;
  return Math.round((correct / quiz.questions.length) * 100);
}

/**
 * Format time taken in human-readable form
 */
function formatTimeTaken(startedAt: string, completedAt: string): string {
  const start = new Date(startedAt).getTime();
  const end = new Date(completedAt).getTime();
  const diffMs = end - start;

  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  }
  return `${remainingSeconds}s`;
}

// ============ HOOK IMPLEMENTATION ============

/**
 * Hook for managing chat-embedded quiz state
 */
export function useChatQuiz(options: UseChatQuizOptions): UseChatQuizState & UseChatQuizActions {
  const { sessionId } = options;

  // State
  const [quiz, setQuiz] = useState<ChatQuizState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completedQuizzes, setCompletedQuizzes] = useState<Array<ChatQuizState & { timeTaken: string; score: number; correctCount: number; completedAt: string }>>([]);
  // Track last completed quiz for retry (with retry count)
  const [lastCompletedQuiz, setLastCompletedQuiz] = useState<(ChatQuizState & { timeTaken: string; score: number; correctCount: number; completedAt: string; retryAttempt: number }) | null>(null);
  // Track last failed quiz config for retry on generation failure
  const [lastFailedConfig, setLastFailedConfig] = useState<ChatQuizState['config'] | null>(null);

  // Last active question — persists after quiz completion for follow-up chat context
  const [lastActiveQuestion, setLastActiveQuestion] = useState<QuizQuestion | null>(null);

  // AbortController for in-flight quiz generation requests
  const quizAbortRef = useRef<AbortController | null>(null);

  // Derive current question
  const currentQuestion = quiz ? quiz.questions[quiz.currentIndex] || null : null;

  // Load saved quiz state on session change (or clear if none exists)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const savedState = getChatQuizState(sessionId);
    if (savedState && !savedState.isCompleted) {
      setQuiz(savedState);
    } else {
      setQuiz(null);
    }
  }, [sessionId]);

  // Persist quiz state when it changes
  useEffect(() => {
    if (quiz && !quiz.isCompleted) {
      saveChatQuizState(sessionId, quiz);
    }
  }, [quiz, sessionId]);

  // Clear storage when quiz is completed
  useEffect(() => {
    if (quiz && quiz.isCompleted) {
      clearChatQuizState(sessionId);
    }
  }, [quiz?.isCompleted, sessionId]);

  // Track last active question for post-completion chat context
  useEffect(() => {
    if (currentQuestion) {
      setLastActiveQuestion(currentQuestion);
    }
  }, [currentQuestion]);

  // ============ ACTIONS ============

  /**
   * Start a new quiz by generating questions from the API
   */
  const startQuiz = useCallback(async (config?: Partial<ChatQuizState['config']>) => {
    // Abort any in-flight quiz generation
    quizAbortRef.current?.abort();
    const abortController = new AbortController();
    quizAbortRef.current = abortController;

    setIsLoading(true);
    setError(null);
    setLastActiveQuestion(null);

    // Merge provided config with defaults
    const quizConfig: ChatQuizState['config'] = {
      level: config?.level ?? DEFAULT_QUIZ_CONFIG.level,
      topics: config?.topics ?? [],
      difficulty: config?.difficulty ?? DEFAULT_QUIZ_CONFIG.difficulty ?? 'all',
      questionCount: config?.questionCount ?? DEFAULT_QUIZ_CONFIG.questionCount,
    };

    try {
      const questions = await generateQuizFromAPI(quizConfig, abortController.signal);

      // Clear failed config on success
      setLastFailedConfig(null);

      // Create initial quiz state
      const newQuiz = createInitialQuizState(questions, quizConfig);
      setQuiz(newQuiz);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      // Store config for retry only on actual failure
      setLastFailedConfig(quizConfig);
      const message = err instanceof Error ? err.message : 'Failed to start quiz';
      setError(message);
      throw err; // Re-throw so callers can handle quiz generation failures
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Select an answer option for the current question
   */
  const selectOption = useCallback((option: 'A' | 'B' | 'C' | 'D') => {
    setQuiz(prev => {
      if (!prev || prev.isCompleted) return prev;

      const newAnswers = [...prev.answers];
      newAnswers[prev.currentIndex] = {
        selected: option,
        isCorrect: option === prev.questions[prev.currentIndex].correctAnswer,
        answeredAt: newAnswers[prev.currentIndex].answeredAt || new Date().toISOString(),
      };

      return { ...prev, answers: newAnswers };
    });
  }, []);

  /**
   * Submit the current answer and show feedback
   */
  const submitAnswer = useCallback(() => {
    setQuiz(prev => {
      if (!prev || prev.isCompleted) return prev;

      // Update answer timestamp if not already set
      const newAnswers = [...prev.answers];
      if (!newAnswers[prev.currentIndex].answeredAt) {
        newAnswers[prev.currentIndex].answeredAt = new Date().toISOString();
      }

      return {
        ...prev,
        answers: newAnswers,
        showFeedback: true,
      };
    });
  }, []);

  /**
   * Move to the next question
   */
  const nextQuestion = useCallback(() => {
    setQuiz(prev => {
      if (!prev || prev.isCompleted) return prev;

      // If feedback is not shown yet, show it first
      if (!prev.showFeedback) {
        return { ...prev, showFeedback: true };
      }

      const nextIndex = prev.currentIndex + 1;

      // Check if quiz is complete
      if (nextIndex >= prev.questions.length) {
        // Mark quiz as completed
        const score = calculateScore(prev);
        const correctCount = prev.answers.filter(a => a.isCorrect).length;
        const completedAt = new Date().toISOString();

        const completedQuiz = {
          ...prev,
          isCompleted: true,
          currentIndex: prev.questions.length - 1,
          completedAt,
          score,
          correctCount,
          timeTaken: formatTimeTaken(prev.startedAt, completedAt),
          retryAttempt: 0, // First attempt
        } as ChatQuizState & { completedAt: string; score: number; correctCount: number; timeTaken: string; retryAttempt: number };

        // Store in completed quizzes for review
        setCompletedQuizzes(old => [...old, completedQuiz]);

        // Store as last completed quiz for retry
        setLastCompletedQuiz(completedQuiz);

        // Clear the quiz state so the Quiz button becomes clickable again
        // The completed quiz data is now in lastCompletedQuiz for the page to use
        return null;
      }

      // Move to next question and hide feedback
      return {
        ...prev,
        currentIndex: nextIndex,
        showFeedback: false,
      };
    });
  }, []);

  /**
   * Go back to the previous question
   */
  const previousQuestion = useCallback(() => {
    setQuiz(prev => {
      if (!prev || prev.isCompleted || prev.currentIndex === 0) return prev;
      return {
        ...prev,
        currentIndex: prev.currentIndex - 1,
        showFeedback: false,
      };
    });
  }, []);

  /**
   * Clear the current error
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Exit and clear quiz state
   */
  const exitQuiz = useCallback(() => {
    setQuiz(null);
    setError(null);
    setLastActiveQuestion(null);
    clearChatQuizState(sessionId);
  }, [sessionId]);

  /**
   * Clear last active question context (used when toggling quiz mode off)
   */
  const clearLastActiveQuestion = useCallback(() => {
    setLastActiveQuestion(null);
  }, []);

  /**
   * Retry the last completed quiz with the same questions
   */
  const retryQuiz = useCallback(() => {
    if (!lastCompletedQuiz) {
      setError('No quiz to retry');
      return;
    }

    setError(null);

    // Create a new quiz state with the same questions but reset answers
    const newRetryQuiz: ChatQuizState = {
      id: crypto.randomUUID(),
      config: lastCompletedQuiz.config,
      questions: lastCompletedQuiz.questions,
      answers: lastCompletedQuiz.questions.map(() => ({
        selected: null,
        isCorrect: false,
        answeredAt: '',
      })),
      currentIndex: 0,
      showFeedback: false,
      startedAt: new Date().toISOString(),
      isCompleted: false,
    };

    setQuiz(newRetryQuiz);
  }, [lastCompletedQuiz]);

  /**
   * Retry a failed quiz generation with the last config
   */
  const retryFailedQuiz = useCallback(async () => {
    if (!lastFailedConfig) {
      setError('No failed quiz to retry');
      return;
    }

    // Abort any in-flight quiz generation
    quizAbortRef.current?.abort();
    const abortController = new AbortController();
    quizAbortRef.current = abortController;

    setIsLoading(true);
    setError(null);

    try {
      const questions = await generateQuizFromAPI(lastFailedConfig, abortController.signal);

      // Clear failed config on success
      setLastFailedConfig(null);

      // Create initial quiz state
      const newQuiz = createInitialQuizState(questions, lastFailedConfig);
      setQuiz(newQuiz);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      const message = err instanceof Error ? err.message : 'Failed to retry quiz generation';
      setError(message);
      throw err; // Re-throw so callers can handle retry failures consistently
    } finally {
      setIsLoading(false);
    }
  }, [lastFailedConfig]);

  /**
   * Abort any in-flight quiz generation request
   */
  const abortQuizGeneration = useCallback(() => {
    quizAbortRef.current?.abort();
    quizAbortRef.current = null;
  }, []);

  return {
    // State
    quiz,
    isLoading,
    error,
    currentQuestion,
    lastActiveQuestion,
    completedQuizzes,
    lastCompletedQuiz,
    lastFailedConfig,

    // Actions
    startQuiz,
    retryQuiz,
    retryFailedQuiz,
    selectOption,
    submitAnswer,
    nextQuestion,
    previousQuestion,
    clearError,
    exitQuiz,
    clearLastActiveQuestion,
    abortQuizGeneration,
  };
}

// ============ UTILITY EXPORTS ============

/**
 * Export utility functions for use in components
 */
export const chatQuizUtils = {
  calculateScore,
  createInitialQuizState,
};
