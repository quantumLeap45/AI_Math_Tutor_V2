/**
 * useChatQuiz Hook
 * AI Math Tutor v2
 *
 * Hook for managing quiz state within chat sessions.
 * Handles quiz generation, answer tracking, feedback display,
 * and persistence for the chat-embedded quiz feature.
 */

import { useState, useCallback, useEffect } from 'react';
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
  /** Completed quizzes for review (stored in memory) */
  completedQuizzes: Array<ChatQuizState & { timeTaken: string; score: number; correctCount: number; completedAt: string }>;
  /** Last completed quiz available for retry (with retry count) */
  lastCompletedQuiz: (ChatQuizState & { timeTaken: string; score: number; correctCount: number; completedAt: string; retryAttempt: number }) | null;
}

interface UseChatQuizActions {
  /** Start a new quiz with the given configuration */
  startQuiz: (config?: Partial<ChatQuizState['config']>) => Promise<void>;
  /** Retry the last completed quiz with same questions */
  retryQuiz: () => Promise<void>;
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

  // Derive current question
  const currentQuestion = quiz ? quiz.questions[quiz.currentIndex] || null : null;

  // Load saved quiz state on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const savedState = getChatQuizState(sessionId);
    if (savedState && !savedState.isCompleted) {
      setQuiz(savedState);
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

  // ============ ACTIONS ============

  /**
   * Start a new quiz by generating questions from the API
   */
  const startQuiz = useCallback(async (config?: Partial<ChatQuizState['config']>) => {
    setIsLoading(true);
    setError(null);

    try {
      // Merge provided config with defaults
      const quizConfig: ChatQuizState['config'] = {
        level: config?.level ?? DEFAULT_QUIZ_CONFIG.level,
        topics: config?.topics ?? [],
        difficulty: config?.difficulty ?? DEFAULT_QUIZ_CONFIG.difficulty ?? 'all',
        questionCount: config?.questionCount ?? DEFAULT_QUIZ_CONFIG.questionCount,
      };

      // Call quiz generation API
      const response = await fetch('/api/generate-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: quizConfig.topics[0] || 'math',
          level: quizConfig.level,
          questionCount: quizConfig.questionCount,
          difficulty: quizConfig.difficulty,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to generate quiz');
      }

      const data = await response.json();

      if (!data.questions || data.questions.length === 0) {
        throw new Error('No questions generated');
      }

      // Create initial quiz state
      const newQuiz = createInitialQuizState(data.questions, quizConfig);
      setQuiz(newQuiz);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start quiz';
      setError(message);
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
    clearChatQuizState(sessionId);
  }, [sessionId]);

  /**
   * Retry the last completed quiz with the same questions
   */
  const retryQuiz = useCallback(async () => {
    if (!lastCompletedQuiz) {
      setError('No quiz to retry');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Create a new quiz state with the same questions but reset answers
      const retryQuiz: ChatQuizState = {
        id: crypto.randomUUID(),
        config: lastCompletedQuiz.config,
        questions: lastCompletedQuiz.questions, // Same questions
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

      setQuiz(retryQuiz);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to retry quiz';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [lastCompletedQuiz]);

  return {
    // State
    quiz,
    isLoading,
    error,
    currentQuestion,
    completedQuizzes,
    lastCompletedQuiz,

    // Actions
    startQuiz,
    retryQuiz,
    selectOption,
    submitAnswer,
    nextQuestion,
    previousQuestion,
    clearError,
    exitQuiz,
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
