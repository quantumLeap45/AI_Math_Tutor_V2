/**
 * useQuiz Hook
 * AI Math Tutor v2
 *
 * Core state management hook for the quiz feature.
 * Handles quiz lifecycle, answer tracking, and persistence.
 * Updated for Phase 2 with multi-resume support.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  QuizConfig,
  QuizAttempt,
  QuizAnswer,
  QuizState as QuizSessionState,
  QuizOption,
  QuizResult,
  TopicPerformance,
  DEFAULT_QUIZ_CONFIG,
  getPerformanceRating,
  QUIZ_STORAGE_KEYS,
} from '@/types';
import {
  addOrUpdateInProgressQuiz,
  getInProgressQuizzes,
  removeInProgressQuiz,
  saveQuizAttempt,
  getQuizAttempts,
  getQuizProgress,
} from '@/lib/storage';


// ============ HOOK STATE ============

/**
 * State returned by useQuiz hook
 */
interface QuizState {
  // Current phase
  phase: 'home' | 'setup' | 'active' | 'loading' | 'results' | 'error';

  // All in-progress quizzes (for multi-resume)
  inProgressQuizzes: QuizAttempt[];

  // Configuration
  config: QuizConfig;

  // Current quiz session
  currentQuiz: QuizAttempt | null;

  // Loading state
  isLoading: boolean;

  // Error state
  error: string | null;

  // Result data (when completed)
  result: QuizResult | null;

  // Time tracking
  elapsed: number;

  // Feedback state - whether answer feedback has been shown for current question
  feedbackShown: boolean;
}

/**
 * Actions available in useQuiz hook
 */
interface QuizActions {
  // Configuration
  setLevel: (level: QuizConfig['level']) => void;
  setTopics: (topics: string[]) => void;
  setDifficulty: (difficulty: QuizConfig['difficulty']) => void;
  setQuestionCount: (count: QuizConfig['questionCount']) => void;

  // Quiz lifecycle
  startQuiz: () => Promise<void>;
  abandonQuiz: () => void;
  resumeQuiz: (quizId: string) => void;
  discardQuiz: (quizId: string) => void;

  // Navigation
  goToSetup: () => void;

  // Question navigation
  selectOption: (option: QuizOption | null) => void;
  submitAnswer: () => void;
  nextQuestion: () => void;
  previousQuestion: () => void;

  // Result actions
  restartQuiz: () => void;
  returnToSetup: () => void;
  saveAndExit: () => void;

  // Utility
  clearError: () => void;
}

// ============ HELPER FUNCTIONS ============

/**
 * Generate a unique answer record
 */
function createAnswer(
  questionId: string,
  selected: QuizOption | null,
  isCorrect: boolean
): QuizAnswer {
  return {
    questionId,
    selected,
    isCorrect,
    timeTaken: 0, // Will be updated by the hook
    answeredAt: new Date().toISOString(),
  };
}

/**
 * Calculate quiz result from an attempt
 */
function calculateResult(attempt: QuizAttempt): QuizResult {
  const score = attempt.score ?? 0;
  const correctCount = attempt.correctCount ?? 0;
  const totalQuestions = attempt.questions.length;
  const totalTime = attempt.totalTime ?? 0;

  // Calculate topic breakdown
  const topicMap = new Map<string, { correct: number; total: number }>();

  for (let i = 0; i < attempt.questions.length; i++) {
    const question = attempt.questions[i];
    const answer = attempt.answers[i];

    if (!topicMap.has(question.topic)) {
      topicMap.set(question.topic, { correct: 0, total: 0 });
    }

    const stats = topicMap.get(question.topic)!;
    stats.total += 1;
    if (answer.isCorrect) {
      stats.correct += 1;
    }
  }

  const topicBreakdown: TopicPerformance[] = Array.from(topicMap.entries()).map(
    ([topic, stats]) => ({
      topic,
      attempted: stats.total,
      correct: stats.correct,
      accuracy: Math.round((stats.correct / stats.total) * 100),
    })
  );

  // Sort by accuracy descending
  topicBreakdown.sort((a, b) => b.accuracy - a.accuracy);

  return {
    attemptId: attempt.id,
    score,
    correctCount,
    totalQuestions,
    totalTime,
    topicBreakdown,
    rating: getPerformanceRating(score),
    completedAt: attempt.completedAt ?? new Date().toISOString(),
  };
}

// ============ HOOK IMPLEMENTATION ============

/**
 * Main quiz hook - manages all quiz state and actions
 */
export function useQuiz(): QuizState & QuizActions {
  // Track question start time for calculating answer duration
  const questionStartTimeRef = useRef<number>(Date.now());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Configuration state
  const [config, setConfig] = useState<QuizConfig>(DEFAULT_QUIZ_CONFIG);

  // Quiz state
  const [phase, setPhase] = useState<QuizState['phase']>('home');
  const [currentQuiz, setCurrentQuiz] = useState<QuizAttempt | null>(null);
  const [inProgressQuizzes, setInProgressQuizzes] = useState<QuizAttempt[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [feedbackShown, setFeedbackShown] = useState(false);

  // Load in-progress quizzes on mount - check for saved quizzes but stay on 'home' phase
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const quizzes = getInProgressQuizzes();
    setInProgressQuizzes(quizzes);

    // If there's a most recent quiz, set config from it
    if (quizzes.length > 0) {
      const mostRecent = quizzes[0]; // Already sorted by startedAt
      setConfig(mostRecent.config);
    }

    // Cleanup timer on unmount
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Timer for elapsed time
  useEffect(() => {
    if (phase === 'active' && !timerRef.current) {
      timerRef.current = setInterval(() => {
        setElapsed(prev => prev + 1);
      }, 1000);
    } else if (phase !== 'active' && timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [phase]);

  // Save current quiz to localStorage whenever it changes (with lastSavedAt timestamp)
  useEffect(() => {
    if (currentQuiz && phase === 'active') {
      const quizWithTimestamp = {
        ...currentQuiz,
        lastSavedAt: new Date().toISOString(),
      };
      // Use multi-resume storage
      const updated = addOrUpdateInProgressQuiz(quizWithTimestamp);
      setInProgressQuizzes(updated);
    }
  }, [currentQuiz, phase]);

  // Reset feedback state when question index changes
  useEffect(() => {
    if (currentQuiz && phase === 'active') {
      setFeedbackShown(false);
    }
  }, [currentQuiz?.currentIndex, phase]);

  // ============ CONFIGURATION SETTERS ============

  const setLevel = useCallback((level: QuizConfig['level']) => {
    setConfig(prev => ({ ...prev, level }));
  }, []);

  const setTopics = useCallback((topics: string[]) => {
    setConfig(prev => ({ ...prev, topics }));
  }, []);

  const setDifficulty = useCallback((difficulty: QuizConfig['difficulty']) => {
    setConfig(prev => ({ ...prev, difficulty }));
  }, []);

  const setQuestionCount = useCallback((questionCount: QuizConfig['questionCount']) => {
    setConfig(prev => ({ ...prev, questionCount }));
  }, []);

  // ============ QUIZ LIFECYCLE ============

  const startQuiz = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setPhase('loading');

    try {
      // Import quiz data utilities dynamically
      const { getQuestionsForConfig } = await import('@/lib/quiz/quiz-data');
      const { shuffleAllQuestionOptions, shuffleArray } = await import('@/lib/quiz/quiz-randomization');

      // Get filtered questions
      const questions = await getQuestionsForConfig(config);

      if (questions.length < config.questionCount) {
        throw new Error(
          `Not enough questions available. Found ${questions.length}, need ${config.questionCount}`
        );
      }

      // CRITICAL FIX: Shuffle question order FIRST, then select
      // Previously: shuffleAllQuestionOptions only shuffled answer options (A/B/C/D), not question order
      // This caused same questions to appear in same order every time
      const shuffledQuestions = shuffleArray(questions);
      const selectedQuestions = shuffledQuestions.slice(0, config.questionCount);

      // Then shuffle answer options within selected questions
      const selected = shuffleAllQuestionOptions(selectedQuestions);

      // Create new quiz attempt
      const now = new Date().toISOString();
      const newQuiz: QuizAttempt = {
        id: crypto.randomUUID(),
        config,
        questions: selected,
        answers: [],
        currentIndex: 0,
        state: 'in_progress' as QuizSessionState,
        startedAt: now,
        accumulatedTime: 0, // Initialize accumulated time
      };

      // Initialize empty answers for all questions
      for (const q of selected) {
        newQuiz.answers.push(
          createAnswer(q.id, null, false)
        );
      }

      setCurrentQuiz(newQuiz);
      setPhase('active');
      setElapsed(0);
      questionStartTimeRef.current = Date.now();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start quiz';
      setError(message);
      setPhase('error');
    } finally {
      setIsLoading(false);
    }
  }, [config]);

  const abandonQuiz = useCallback(() => {
    // Mark current quiz as abandoned and remove from in-progress
    if (currentQuiz) {
      // Just remove from in-progress - don't save abandoned state
      removeInProgressQuiz(currentQuiz.id);
      const updated = getInProgressQuizzes();
      setInProgressQuizzes(updated);
    }

    // Clear current quiz and return to home
    setCurrentQuiz(null);
    setResult(null);
    setPhase('home');
    setElapsed(0);
  }, [currentQuiz]);

  const resumeQuiz = useCallback((quizId: string) => {
    // Find the quiz in in-progress list
    const quiz = inProgressQuizzes.find(q => q.id === quizId);
    if (!quiz) return;

    // Load quiz into current quiz and go to active phase
    setCurrentQuiz(quiz);
    setConfig(quiz.config);
    setPhase('active');

    // Use accumulated time (saved accumulated time, not total from startedAt)
    setElapsed(quiz.accumulatedTime ?? 0);

    questionStartTimeRef.current = Date.now();
  }, [inProgressQuizzes]);

  const discardQuiz = useCallback((quizId: string) => {
    // Remove quiz from in-progress storage
    const removed = removeInProgressQuiz(quizId);
    if (removed) {
      // Update the list
      const updated = getInProgressQuizzes();
      setInProgressQuizzes(updated);
    }

    // If the discarded quiz was the current one, clear currentQuiz
    if (currentQuiz?.id === quizId) {
      setCurrentQuiz(null);
      setResult(null);
      setElapsed(0);
      setPhase('home');
    }
  }, [currentQuiz]);

  const goToSetup = useCallback(() => {
    setPhase('setup');
  }, []);

  // ============ QUESTION NAVIGATION ============

  const selectOption = useCallback((option: QuizOption | null) => {
    setCurrentQuiz(prev => {
      if (!prev) return null;

      const newAnswers = [...prev.answers];
      const currentIdx = prev.currentIndex;
      const question = prev.questions[currentIdx];

      // Update the answer with the selected option
      newAnswers[currentIdx] = {
        ...newAnswers[currentIdx],
        selected: option,
        isCorrect: option === question.correctAnswer,
      };

      return { ...prev, answers: newAnswers };
    });
  }, []);

  const submitAnswer = useCallback(() => {
    setCurrentQuiz(prev => {
      if (!prev) return null;

      const currentIdx = prev.currentIndex;
      const newAnswers = [...prev.answers];

      // Calculate time taken for this question
      const timeTaken = Date.now() - questionStartTimeRef.current;
      newAnswers[currentIdx] = {
        ...newAnswers[currentIdx],
        timeTaken,
        answeredAt: new Date().toISOString(),
      };

      return { ...prev, answers: newAnswers };
    });
  }, []);

  const nextQuestion = useCallback(() => {
    // First, check if we need to show feedback
    if (!feedbackShown) {
      // Show feedback instead of moving to next question
      setFeedbackShown(true);
      // Also submit the answer time when showing feedback
      submitAnswer();
      return;
    }

    // Feedback has been shown, proceed to next question
    setCurrentQuiz(prev => {
      if (!prev) return null;

      const nextIndex = prev.currentIndex + 1;

      // Check if quiz is complete
      if (nextIndex >= prev.questions.length) {
        // Calculate final score
        let correctCount = 0;
        for (let i = 0; i < prev.answers.length; i++) {
          if (prev.answers[i].isCorrect) {
            correctCount += 1;
          }
        }

        const score = Math.round((correctCount / prev.questions.length) * 100);
        const now = new Date().toISOString();
        const totalTime = Date.now() - new Date(prev.startedAt).getTime();

        const completed: QuizAttempt = {
          ...prev,
          state: 'completed' as QuizSessionState,
          score,
          correctCount,
          completedAt: now,
          totalTime,
        };

        // Save to attempts history using storage function
        saveQuizAttempt(completed);

        // Remove from in-progress since it's completed
        removeInProgressQuiz(completed.id);

        // Update the in-progress list
        const updated = getInProgressQuizzes();
        setInProgressQuizzes(updated);

        // Update progress stats
        updateProgressStats(completed);

        // Clear current quiz from legacy storage (if any)
        if (typeof window !== 'undefined') {
          localStorage.removeItem(QUIZ_STORAGE_KEYS.CURRENT);
        }

        // Calculate and set result
        const quizResult = calculateResult(completed);
        setResult(quizResult);
        setPhase('results');

        return completed;
      }

      // Move to next question
      questionStartTimeRef.current = Date.now();
      return { ...prev, currentIndex: nextIndex };
    });

    // Reset feedback state for next question
    setFeedbackShown(false);
  }, [feedbackShown, submitAnswer]);

  const previousQuestion = useCallback(() => {
    setCurrentQuiz(prev => {
      if (!prev || prev.currentIndex === 0) return prev;
      return { ...prev, currentIndex: prev.currentIndex - 1 };
    });
  }, []);

  // ============ RESULT ACTIONS ============

  const restartQuiz = useCallback(() => {
    // Restart with same configuration
    startQuiz();
  }, [startQuiz]);

  const returnToSetup = useCallback(() => {
    setCurrentQuiz(null);
    setResult(null);
    setPhase('home');
    setElapsed(0);
    // No need to manually clear - in-progress quizzes are managed by storage functions
  }, []);

  const saveAndExit = useCallback(() => {
    // Keep quiz in localStorage (already auto-saved), return to home
    // Clear currentQuiz from React state but keep in localStorage
    if (currentQuiz) {
      // Update lastSavedAt and accumulatedTime before exiting
      const quizToSave = {
        ...currentQuiz,
        lastSavedAt: new Date().toISOString(),
        accumulatedTime: elapsed, // Save current elapsed time as accumulated
      };
      // Use multi-resume storage
      addOrUpdateInProgressQuiz(quizToSave);
    }
    setCurrentQuiz(null);
    setResult(null);
    setPhase('home');
    setElapsed(0);
  }, [currentQuiz, elapsed]);

  // ============ UTILITY ============

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // State
    phase,
    config,
    currentQuiz,
    inProgressQuizzes,
    isLoading,
    error,
    result,
    elapsed,
    feedbackShown,

    // Configuration
    setLevel,
    setTopics,
    setDifficulty,
    setQuestionCount,

    // Quiz lifecycle
    startQuiz,
    abandonQuiz,
    resumeQuiz,
    discardQuiz,

    // Navigation
    goToSetup,

    // Question navigation
    selectOption,
    submitAnswer,
    nextQuestion,
    previousQuestion,

    // Result actions
    restartQuiz,
    returnToSetup,
    saveAndExit,

    // Utility
    clearError,
  };
}

// ============ PROGRESS STATISTICS ============

/**
 * Create a default progress object
 * Must match QuizProgress.byLevel structure (LevelProgress type)
 */
function createDefaultProgress() {
  const levels: Array<'P1' | 'P2' | 'P3' | 'P4' | 'P5' | 'P6'> = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'];
  const byLevel: Record<string, {
    level: string;
    quizzesCompleted: number;
    questionsAnswered: number;
    averageScore: number;
    masteredTopics: string[];
    needsPractice: string[];
  }> = {};

  for (const level of levels) {
    byLevel[level] = {
      level,
      quizzesCompleted: 0,
      questionsAnswered: 0,
      averageScore: 0,
      masteredTopics: [],
      needsPractice: [],
    };
  }

  return {
    totalQuizzes: 0,
    totalQuestions: 0,
    overallAccuracy: 0,
    bestScore: 0,
    currentStreak: 0,
    byLevel,
    weakAreas: [],
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Update overall progress statistics after completing a quiz
 */
function updateProgressStats(attempt: QuizAttempt): void {
  if (typeof window === 'undefined') return;

  try {
    const savedJson = localStorage.getItem(QUIZ_STORAGE_KEYS.PROGRESS);
    const progress = savedJson ? JSON.parse(savedJson) : createDefaultProgress();

    // Update totals
    progress.totalQuizzes += 1;
    progress.totalQuestions += attempt.questions.length;

    // Update overall accuracy
    const score = attempt.score ?? 0;
    progress.overallAccuracy = Math.round(
      ((progress.overallAccuracy * (progress.totalQuizzes - 1)) / 100 + score / 100) /
        progress.totalQuizzes * 100
    );

    // Update best score
    if (score > progress.bestScore) {
      progress.bestScore = score;
    }

    // Update level-specific stats
    const level = attempt.config.level;
    if (!progress.byLevel[level]) {
      // Initialize level if missing (migration from old format)
      progress.byLevel[level] = {
        level,
        quizzesCompleted: 0,
        questionsAnswered: 0,
        averageScore: 0,
        masteredTopics: [],
        needsPractice: [],
      };
    }
    progress.byLevel[level].quizzesCompleted += 1;
    progress.byLevel[level].questionsAnswered += attempt.questions.length;
    const previousTotal = progress.byLevel[level].averageScore * (progress.byLevel[level].quizzesCompleted - 1);
    progress.byLevel[level].averageScore = Math.round((previousTotal + score) / progress.byLevel[level].quizzesCompleted);

    // Update weak areas (topics with <60% accuracy)
    const topicScores: Record<string, { correct: number; total: number }> = {};
    for (let i = 0; i < attempt.questions.length; i++) {
      const q = attempt.questions[i];
      const a = attempt.answers[i];

      if (!topicScores[q.topic]) {
        topicScores[q.topic] = { correct: 0, total: 0 };
      }
      topicScores[q.topic].total += 1;
      if (a.isCorrect) {
        topicScores[q.topic].correct += 1;
      }
    }

    for (const [topic, scores] of Object.entries(topicScores)) {
      const accuracy = (scores.correct / scores.total) * 100;
      if (accuracy < 60 && !progress.weakAreas.includes(topic)) {
        progress.weakAreas.push(topic);
        // Limit weak areas to 10
        if (progress.weakAreas.length > 10) {
          progress.weakAreas = progress.weakAreas.slice(0, 10);
        }
      }
    }

    progress.lastUpdated = new Date().toISOString();
    localStorage.setItem(QUIZ_STORAGE_KEYS.PROGRESS, JSON.stringify(progress));
  } catch (e) {
    // Silently fail if localStorage is unavailable
  }
}

// ============ UTILITY HOOKS ============

/**
 * Hook to get quiz statistics summary
 */
export function useQuizStats() {
  const [stats, setStats] = useState<{
    totalQuizzes: number;
    overallAccuracy: number;
    bestScore: number;
    currentStreak: number;
  }>({
    totalQuizzes: 0,
    overallAccuracy: 0,
    bestScore: 0,
    currentStreak: 0,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const loadStats = () => {
      const progress = getQuizProgress();
      setStats({
        totalQuizzes: progress.totalQuizzes ?? 0,
        overallAccuracy: progress.overallAccuracy ?? 0,
        bestScore: progress.bestScore ?? 0,
        currentStreak: progress.currentStreak ?? 0,
      });
    };

    loadStats();

    // Listen for storage changes (in case another tab updates)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === QUIZ_STORAGE_KEYS.PROGRESS) {
        loadStats();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return stats;
}

/**
 * Hook to get recent quiz attempts
 */
export function useQuizAttempts(limit: number = 10) {
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const loadAttempts = () => {
      const all = getQuizAttempts();
      setAttempts(all.slice(0, limit));
    };

    loadAttempts();

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === QUIZ_STORAGE_KEYS.ATTEMPTS) {
        loadAttempts();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [limit]);

  return attempts;
}
