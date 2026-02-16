/**
 * useQuizMode Hook
 * AI Math Tutor v2
 *
 * Manages quiz orchestration: toggle quiz mode, handle answers,
 * retry, review, and completion summary.
 *
 * Does NOT import other hooks — receives dependencies via options.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { ChatQuizState, QuizSummaryData, QuizQuestion, TutorMode, ChatSession } from '@/types';
import { createMessage, createQuizSummaryMessage } from '@/lib/chat';
import { saveSession } from '@/lib/storage';

// Subset of useChatQuiz return type — avoids importing the hook directly
interface ChatQuizHook {
  quiz: ChatQuizState | null;
  currentQuestion: QuizQuestion | null;
  lastActiveQuestion: QuizQuestion | null;
  lastCompletedQuiz: (ChatQuizState & {
    timeTaken: string;
    score: number;
    correctCount: number;
    completedAt: string;
    retryAttempt: number;
  }) | null;
  lastFailedConfig: ChatQuizState['config'] | null;
  isLoading: boolean;
  startQuiz: (config?: Partial<ChatQuizState['config']>) => Promise<void>;
  retryQuiz: () => void;
  retryFailedQuiz: () => Promise<void>;
  selectOption: (option: 'A' | 'B' | 'C' | 'D') => void;
  nextQuestion: () => void;
  exitQuiz: () => void;
  clearLastActiveQuestion: () => void;
  abortQuizGeneration: () => void;
}

interface UseQuizModeOptions {
  chatQuiz: ChatQuizHook;
  currentSession: ChatSession | null;
  mode: TutorMode;
  quizSessionId: string;
  setCurrentSession: React.Dispatch<React.SetStateAction<ChatSession | null>>;
  setSessions: React.Dispatch<React.SetStateAction<ChatSession[]>>;
  setQuizSessionId: React.Dispatch<React.SetStateAction<string>>;
  onAutoCollapse: () => void;
  onCloseMobileSidebar: () => void;
  onModeChange: (mode: TutorMode) => void;
}

export function useQuizMode(options: UseQuizModeOptions) {
  const {
    chatQuiz,
    currentSession,
    mode,
    quizSessionId,
    setCurrentSession,
    setSessions,
    setQuizSessionId,
    onAutoCollapse,
    onCloseMobileSidebar,
    onModeChange,
  } = options;

  // State
  const [quizModeActive, setQuizModeActive] = useState(false);
  const [isQuizLoading, setIsQuizLoading] = useState(false);
  const [quizGenerationError, setQuizGenerationError] = useState<string | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [selectedQuizForReview, setSelectedQuizForReview] = useState<QuizSummaryData | null>(null);
  const [currentRetryAttempt, setCurrentRetryAttempt] = useState(0);
  const [preQuizMode, setPreQuizMode] = useState<TutorMode | null>(null);

  // Track processed quiz IDs (prevents infinite loop on completion)
  const processedQuizIdsRef = useRef<Set<string>>(new Set());

  // Auto-collapse sidebar when quiz mode activates (once)
  const [hasAutoCollapsed, setHasAutoCollapsed] = useState(false);

  useEffect(() => {
    if (quizModeActive && !hasAutoCollapsed) {
      onAutoCollapse();
      setHasAutoCollapsed(true);
      onCloseMobileSidebar();
    } else if (!quizModeActive) {
      setHasAutoCollapsed(false);
    }
  }, [quizModeActive, hasAutoCollapsed, onAutoCollapse, onCloseMobileSidebar]);

  // Handle quiz completion — adds summary message to chat
  useEffect(() => {
    if (!chatQuiz.lastCompletedQuiz) return;

    const completedQuiz = chatQuiz.lastCompletedQuiz;

    if (processedQuizIdsRef.current.has(completedQuiz.id)) return;
    processedQuizIdsRef.current.add(completedQuiz.id);

    const rawScore = completedQuiz.correctCount;
    const percentage = completedQuiz.score;
    const timeTaken = completedQuiz.timeTaken;

    const summaryMessage = createQuizSummaryMessage({
      config: completedQuiz.config,
      score: rawScore,
      totalQuestions: completedQuiz.questions.length,
      percentage,
      timeTaken,
      retryAttempt: currentRetryAttempt,
      isRetry: currentRetryAttempt > 0,
      questions: completedQuiz.questions,
      answers: completedQuiz.answers,
      completedAt: completedQuiz.completedAt,
      startedAt: completedQuiz.startedAt,
    });

    setCurrentSession(prevSession => {
      if (!prevSession) return prevSession;

      const updatedSession = {
        ...prevSession,
        messages: [...prevSession.messages, summaryMessage],
        updatedAt: new Date().toISOString(),
      };

      saveSession(updatedSession);
      setSessions(prev =>
        prev.map(s => (s.id === updatedSession.id ? updatedSession : s))
      );

      return updatedSession;
    });
  }, [chatQuiz.lastCompletedQuiz, currentRetryAttempt, setCurrentSession, setSessions]);

  // Toggle quiz mode on/off
  const handleQuizModeToggle = useCallback(() => {
    if (chatQuiz.quiz) return;

    if (quizModeActive) {
      setQuizModeActive(false);
      chatQuiz.clearLastActiveQuestion();
    } else {
      if (currentSession && quizSessionId !== currentSession.id) {
        setQuizSessionId(currentSession.id);
      }
      setQuizModeActive(true);
    }
  }, [quizModeActive, chatQuiz.quiz, currentSession, quizSessionId, setQuizSessionId]);

  // Exit quiz — restore previous mode
  const handleQuizExit = useCallback(() => {
    chatQuiz.exitQuiz();
    setQuizModeActive(false);
    if (preQuizMode) {
      onModeChange(preQuizMode);
      setPreQuizMode(null);
    }
  }, [chatQuiz, preQuizMode, onModeChange]);

  // Select option in quiz
  const handleQuizSelectOption = useCallback((option: 'A' | 'B' | 'C' | 'D') => {
    chatQuiz.selectOption(option);
  }, [chatQuiz]);

  // Next question / complete quiz
  const handleQuizNext = useCallback(() => {
    const quiz = chatQuiz.quiz;
    if (!quiz) return;

    const isLastQuestion = quiz.currentIndex === quiz.questions.length - 1;

    if (isLastQuestion && quiz.showFeedback) {
      chatQuiz.nextQuestion();
      // Keep quizModeActive = true so post-completion chat messages
      // still route to quiz chat API with lastActiveQuestion context.
      // User can toggle quiz mode off when done asking follow-up questions.
      if (preQuizMode) {
        onModeChange(preQuizMode);
        setPreQuizMode(null);
      }
    } else {
      chatQuiz.nextQuestion();
    }
  }, [chatQuiz, preQuizMode, onModeChange]);

  // Open review modal
  const handleReviewQuiz = useCallback((quiz: QuizSummaryData) => {
    setSelectedQuizForReview(quiz);
    setIsReviewModalOpen(true);
  }, []);

  // Retry quiz with same questions
  const handleRetryQuiz = useCallback(async () => {
    setIsReviewModalOpen(false);
    setSelectedQuizForReview(null);
    setCurrentRetryAttempt(prev => prev + 1);
    setQuizModeActive(true);

    if (!preQuizMode) {
      setPreQuizMode(mode);
    }
    onModeChange('TEACH');

    await chatQuiz.retryQuiz();
  }, [chatQuiz, mode, preQuizMode, onModeChange]);

  // Retry failed quiz generation
  const handleRetryFailedQuiz = useCallback(async () => {
    if (!chatQuiz.lastFailedConfig) return;

    setIsQuizLoading(true);
    setQuizGenerationError(null);

    try {
      await chatQuiz.retryFailedQuiz();

      if (currentSession && chatQuiz.quiz) {
        const aiMessage = createMessage(
          'assistant',
          `Great! I've prepared ${chatQuiz.lastFailedConfig.questionCount} ${chatQuiz.lastFailedConfig.level} questions for you to practice. You can ask me questions while you work through them.`
        );

        const sessionWithAI = {
          ...currentSession,
          messages: [...currentSession.messages, aiMessage],
          updatedAt: new Date().toISOString(),
        };

        setCurrentSession(sessionWithAI);
        saveSession(sessionWithAI);
        setSessions(prev =>
          prev.map(s => (s.id === sessionWithAI.id ? sessionWithAI : s))
        );
      }
    } catch (error) {
      console.error('Quiz retry error:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to generate quiz. Please try again.';
      setQuizGenerationError(errorMsg);
    } finally {
      setIsQuizLoading(false);
    }
  }, [chatQuiz, currentSession, setCurrentSession, setSessions]);

  // Reset quiz state (called by page when session changes)
  const resetQuizState = useCallback(() => {
    setQuizModeActive(false);
    setCurrentRetryAttempt(0);
    chatQuiz.clearLastActiveQuestion();
  }, [chatQuiz.clearLastActiveQuestion]);

  // Close review modal
  const closeReviewModal = useCallback(() => {
    setIsReviewModalOpen(false);
    setSelectedQuizForReview(null);
  }, []);

  return {
    // State
    quizModeActive,
    isQuizLoading,
    quizGenerationError,
    isReviewModalOpen,
    selectedQuizForReview,
    currentRetryAttempt,
    preQuizMode,

    // Setters (for handleSendMessage in page)
    setQuizModeActive,
    setIsQuizLoading,
    setQuizGenerationError,
    setCurrentRetryAttempt,
    setPreQuizMode,

    // Actions
    handleQuizModeToggle,
    handleQuizExit,
    handleQuizSelectOption,
    handleQuizNext,
    handleReviewQuiz,
    handleRetryQuiz,
    handleRetryFailedQuiz,
    resetQuizState,
    closeReviewModal,
  };
}
