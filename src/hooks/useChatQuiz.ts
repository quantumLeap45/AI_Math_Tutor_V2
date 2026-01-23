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
}

interface UseChatQuizActions {
  /** Start a new quiz with the given configuration */
  startQuiz: (config?: Partial<ChatQuizState['config']>) => Promise<void>;
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
      const response = await fetch('/api/quiz/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(quizConfig),
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

        return {
          ...prev,
          isCompleted: true,
          currentIndex: prev.questions.length - 1,
          // Add completion metadata
          completedAt: new Date().toISOString(),
          score,
          correctCount,
        } as ChatQuizState & { completedAt: string; score: number; correctCount: number };
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

  return {
    // State
    quiz,
    isLoading,
    error,
    currentQuestion,

    // Actions
    startQuiz,
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
