'use client';

/**
 * Chat Page
 * AI Math Tutor v2
 *
 * Thin orchestrator that wires together session management, quiz mode,
 * and daily quota hooks. Owns handleSendMessage and layout rendering.
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { ChatSidebar } from '@/components/ChatSidebar';
import { QuizPanel, QuizLoadingPanel, QuizReviewModal, ChatHeader, ChatMessagesArea } from '@/components/chat';
import { ThemeToggle } from '@/components/ThemeToggle';
import { ChatSession } from '@/types';
import {
  createSession,
  saveSession,
  saveSettings,
} from '@/lib/storage';
import { createMessage, updateSessionTitleFromFirstMessage } from '@/lib/chat';
import { parseQuizSettings } from '@/lib/quiz-parser';
import { useDailyQuota } from '@/hooks/useDailyQuota';
import { useChatQuiz } from '@/hooks';
import { useSessionManagement } from '@/hooks/useSessionManagement';
import { useQuizMode } from '@/hooks/useQuizMode';

export default function ChatPage() {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatAbortControllerRef = useRef<AbortController | null>(null);

  // Sidebar UI state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Message sending state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Daily quota hook
  const { quotaStatus, quotaLoaded, countdown, consumeQuota, updateQuotaFromResponse } = useDailyQuota();

  // Session management hook
  const sessionMgmt = useSessionManagement();

  // Chat quiz hook
  const chatQuiz = useChatQuiz({ sessionId: sessionMgmt.quizSessionId });

  // Quiz mode hook
  const quizMode = useQuizMode({
    chatQuiz,
    currentSession: sessionMgmt.currentSession,
    mode: sessionMgmt.mode,
    quizSessionId: sessionMgmt.quizSessionId,
    setCurrentSession: sessionMgmt.setCurrentSession,
    setSessions: sessionMgmt.setSessions,
    setQuizSessionId: sessionMgmt.setQuizSessionId,
    onAutoCollapse: useCallback(() => setSidebarCollapsed(true), []),
    onCloseMobileSidebar: useCallback(() => setSidebarOpen(false), []),
    onModeChange: sessionMgmt.handleModeChange,
  });

  // Wrap session handlers to also reset quiz state
  const handleNewChat = useCallback(() => {
    sessionMgmt.handleNewChat();
    quizMode.resetQuizState();
  }, [sessionMgmt.handleNewChat, quizMode.resetQuizState]);

  const handleSelectSession = useCallback((sessionId: string) => {
    sessionMgmt.handleSelectSession(sessionId);
    quizMode.resetQuizState();
  }, [sessionMgmt.handleSelectSession, quizMode.resetQuizState]);

  // Auto-scroll on new messages
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [sessionMgmt.currentSession?.messages, scrollToBottom]);

  // Cleanup AbortController on unmount
  useEffect(() => {
    return () => {
      chatAbortControllerRef.current?.abort();
    };
  }, []);

  // Send message (central coordinator)
  const handleSendMessage = useCallback(
    async (content: string, image?: string) => {
      if (!content.trim() && !image) return;

      const quotaResult = consumeQuota();
      if (!quotaResult.allowed) {
        setError(`Daily limit reached. Quota resets in ${countdown?.formatted || '24:00:00'}.`);
        return;
      }

      setError(null);

      // ===== Quiz generation path =====
      if (quizMode.quizModeActive && !chatQuiz.quiz) {
        let session = sessionMgmt.currentSession;
        if (!session) {
          session = createSession(sessionMgmt.mode);
          sessionMgmt.setCurrentSession(session);
          sessionMgmt.setSessions(prev => [session!, ...prev]);
          saveSession(session);
          saveSettings({ lastActiveSession: session.id });
          sessionMgmt.setQuizSessionId(session.id);
        }

        const {
          level,
          topic,
          difficulty,
          questionCount,
          requestedQuestionCount,
          wasQuestionCountCapped,
          maxQuestionCount,
        } = parseQuizSettings(content);

        const userMessage = createMessage('user', content);
        const updatedSession = {
          ...session,
          messages: [...session.messages, userMessage],
          updatedAt: new Date().toISOString(),
        };

        sessionMgmt.setCurrentSession(updatedSession);
        saveSession(updatedSession);
        sessionMgmt.setSessions(prev =>
          prev.map(s => (s.id === updatedSession.id ? updatedSession : s))
        );

        quizMode.setPreQuizMode(sessionMgmt.mode);
        sessionMgmt.setMode('TEACH');
        quizMode.setIsQuizLoading(true);
        quizMode.setCurrentRetryAttempt(0);

        try {
          await chatQuiz.startQuiz({ level, topics: [topic], difficulty, questionCount });

          const assistantMessage = wasQuestionCountCapped && requestedQuestionCount
            ? `Great! I can generate up to ${maxQuestionCount} questions per quiz. You asked for ${requestedQuestionCount}, so I've prepared ${questionCount} ${level} questions for you to practice. You can ask me questions while you work through them.`
            : `Great! I've prepared ${questionCount} ${level} questions for you to practice. You can ask me questions while you work through them.`;

          const aiMessage = createMessage('assistant', assistantMessage);

          const sessionWithAI = {
            ...updatedSession,
            messages: [...updatedSession.messages, aiMessage],
            updatedAt: new Date().toISOString(),
          };

          sessionMgmt.setCurrentSession(sessionWithAI);
          saveSession(sessionWithAI);
          sessionMgmt.setSessions(prev =>
            prev.map(s => (s.id === sessionWithAI.id ? sessionWithAI : s))
          );
        } catch (err) {
          console.error('Quiz generation error:', err);
          const errorMsg = err instanceof Error ? err.message : 'Failed to generate quiz. Please try again.';
          quizMode.setQuizGenerationError(errorMsg);

          const errorMessage = createMessage(
            'assistant',
            `Sorry, I couldn't generate the quiz. ${errorMsg}`
          );

          const sessionWithError = {
            ...updatedSession,
            messages: [...updatedSession.messages, errorMessage],
            updatedAt: new Date().toISOString(),
          };

          sessionMgmt.setCurrentSession(sessionWithError);
          saveSession(sessionWithError);
          sessionMgmt.setSessions(prev =>
            prev.map(s => (s.id === sessionWithError.id ? sessionWithError : s))
          );
        } finally {
          quizMode.setIsQuizLoading(false);
        }
        return;
      }

      // ===== Regular chat path =====
      let session = sessionMgmt.currentSession;
      if (!session) {
        session = createSession(sessionMgmt.mode);
        sessionMgmt.setCurrentSession(session);
        sessionMgmt.setSessions(prev => [session!, ...prev]);
        sessionMgmt.setQuizSessionId(session.id);
      }

      const userMessage = createMessage('user', content, image);
      const updatedSession: ChatSession = {
        ...session,
        mode: sessionMgmt.mode,
        messages: [...session.messages, userMessage],
        updatedAt: new Date().toISOString(),
      };

      const sessionWithTitle = updateSessionTitleFromFirstMessage(updatedSession);

      sessionMgmt.setCurrentSession(sessionWithTitle);
      sessionMgmt.setSessions(prev =>
        prev.map(s => (s.id === sessionWithTitle.id ? sessionWithTitle : s))
      );
      saveSession(sessionWithTitle);
      saveSettings({ lastActiveSession: sessionWithTitle.id });

      setIsLoading(true);

      // Abort any in-flight chat request before starting a new one
      chatAbortControllerRef.current?.abort();
      const abortController = new AbortController();
      chatAbortControllerRef.current = abortController;

      try {
        const isQuizChatMode = quizMode.quizModeActive && chatQuiz.quiz && chatQuiz.currentQuestion;

        let response: Response;

        if (isQuizChatMode) {
          const conversationHistory = sessionWithTitle.messages
            .filter(msg => !msg.quizSummary && msg.role !== 'quiz_summary')
            .map(msg => ({
              role: msg.role as 'user' | 'assistant',
              content: msg.content,
              timestamp: msg.timestamp,
            }));

          response = await fetch('/api/v1/quiz/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              question: chatQuiz.currentQuestion!.question,
              options: Object.values(chatQuiz.currentQuestion!.options),
              message: content,
              conversationHistory,
            }),
            signal: abortController.signal,
          });
        } else {
          const messagesForApi = sessionWithTitle.messages.filter(
            msg => !msg.quizSummary && msg.role !== 'quiz_summary'
          );

          response = await fetch('/api/v1/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              messages: messagesForApi,
              mode: sessionMgmt.mode,
              image,
            }),
            signal: abortController.signal,
          });
        }

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          updateQuotaFromResponse(response);
          throw new Error(errorData.error || 'Failed to get response');
        }

        updateQuotaFromResponse(response);

        const reader = response.body?.getReader();
        if (!reader) throw new Error('No response body');

        const decoder = new TextDecoder();
        let assistantContent = '';

        const assistantMessage = createMessage('assistant', '');
        let sessionWithAssistant: ChatSession = {
          ...sessionWithTitle,
          messages: [...sessionWithTitle.messages, assistantMessage],
          updatedAt: new Date().toISOString(),
        };

        sessionMgmt.setCurrentSession(sessionWithAssistant);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          assistantContent += chunk;

          sessionWithAssistant = {
            ...sessionWithAssistant,
            messages: sessionWithAssistant.messages.map((m, i) =>
              i === sessionWithAssistant.messages.length - 1
                ? { ...m, content: assistantContent }
                : m
            ),
            updatedAt: new Date().toISOString(),
          };

          sessionMgmt.setCurrentSession(sessionWithAssistant);
        }

        sessionMgmt.setSessions(prev =>
          prev.map(s =>
            s.id === sessionWithAssistant.id ? sessionWithAssistant : s
          )
        );
        saveSession(sessionWithAssistant);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        console.error('Chat error:', err);
        setError(err instanceof Error ? err.message : 'Something went wrong');
      } finally {
        setIsLoading(false);
      }
    },
    [sessionMgmt.currentSession, sessionMgmt.mode, consumeQuota, countdown, updateQuotaFromResponse, quizMode.quizModeActive, chatQuiz, chatQuiz.currentQuestion]
  );

  // Derived state
  const hasSessions = sessionMgmt.sessions.length > 0;

  // Shared ChatMessagesArea props
  const messagesAreaProps = {
    currentSession: sessionMgmt.currentSession,
    quizModeActive: quizMode.quizModeActive,
    isQuizActive: quizMode.quizModeActive && (!!chatQuiz.quiz || quizMode.isQuizLoading),
    isLoading,
    isQuizLoading: quizMode.isQuizLoading,
    mode: sessionMgmt.mode,
    onModeChange: sessionMgmt.handleModeChange,
    error,
    countdown,
    messagesEndRef,
    onSendMessage: handleSendMessage,
    onReviewQuiz: quizMode.handleReviewQuiz,
    onRetryQuiz: quizMode.handleRetryQuiz,
    onDismissError: () => setError(null),
  };

  // Loading state
  if (!sessionMgmt.mounted || !sessionMgmt.username) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-900">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-white dark:bg-slate-900">
      {/* Header: minimal for first-ever visit, full when user has any history */}
      {hasSessions ? (
        <ChatHeader
          isLoading={isLoading}
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
          onOpenMobileSidebar={() => setSidebarOpen(true)}
          currentSession={sessionMgmt.currentSession}
          onClearChat={sessionMgmt.handleClearChat}
          quotaRemaining={quotaStatus.remaining}
          quotaLimit={quotaStatus.limit}
          quotaLoaded={quotaLoaded}
          quizModeActive={quizMode.quizModeActive}
          onQuizModeToggle={quizMode.handleQuizModeToggle}
          quizDisabled={isLoading || quizMode.isQuizLoading || chatQuiz.isLoading}
          quizLocked={quizMode.quizModeActive && !!chatQuiz.quiz && !chatQuiz.quiz.isCompleted}
          quizCurrentQuestion={chatQuiz.quiz ? chatQuiz.quiz.currentIndex + 1 : undefined}
          quizTotalQuestions={chatQuiz.quiz ? chatQuiz.quiz.questions.length : undefined}
        />
      ) : (
        /* Minimal header for welcome state */
        <header className="sticky top-0 z-40 h-14 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
          <div className="h-full flex items-center justify-between px-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center">
                <span className="text-white font-bold text-lg">M</span>
              </div>
              <span className="hidden sm:block text-lg font-semibold text-slate-900 dark:text-slate-100">
                AI Math Tutor
              </span>
            </Link>
            <div className="flex items-center gap-2">
              {quotaLoaded && (
                <div className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800">
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-400 tabular-nums">
                    {quotaStatus.remaining}/{quotaStatus.limit} left
                  </span>
                </div>
              )}
              <button
                type="button"
                onClick={quizMode.handleQuizModeToggle}
                disabled={isLoading || quizMode.isQuizLoading || chatQuiz.isLoading}
                className={`
                  relative px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium
                  transition-colors flex items-center gap-1.5
                  ${(isLoading || quizMode.isQuizLoading || chatQuiz.isLoading)
                    ? 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500'
                    : quizMode.quizModeActive
                    ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }
                `}
                aria-pressed={quizMode.quizModeActive}
                aria-label="Quiz mode"
                title={quizMode.quizModeActive ? 'Exit quiz mode' : 'Start quiz mode'}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 11l3 3L22 4" />
                  <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                </svg>
                <span className="hidden sm:inline">Quiz Mode</span>
              </button>
              <ThemeToggle />
            </div>
          </div>
        </header>
      )}

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar — shown when user has any session history */}
        {hasSessions && (
          <ChatSidebar
            sessions={sessionMgmt.sessions}
            currentSessionId={sessionMgmt.currentSession?.id}
            onNewChat={handleNewChat}
            onSelectSession={handleSelectSession}
            onDeleteSession={sessionMgmt.handleDeleteSession}
            isOpen={sidebarOpen}
            collapsed={sidebarCollapsed}
            onClose={() => setSidebarOpen(false)}
            onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          />
        )}

        {/* Content wrapper: Chat area + optional Quiz Panel */}
        <div className="flex-1 flex overflow-hidden">
          <ChatMessagesArea {...messagesAreaProps} />

          {/* Quiz Loading Panel — shown while generating questions */}
          {quizMode.isQuizLoading && quizMode.quizModeActive && (
            <QuizLoadingPanel
              isVisible={true}
              onCancel={() => {
                chatQuiz.abortQuizGeneration();
                quizMode.setIsQuizLoading(false);
                quizMode.setQuizModeActive(false);
              }}
            />
          )}

          {/* Quiz Panel — shown when questions are ready */}
          {!quizMode.isQuizLoading && quizMode.quizModeActive && chatQuiz.quiz && chatQuiz.currentQuestion && (
            <QuizPanel
              currentQuestion={chatQuiz.currentQuestion}
              questionNumber={chatQuiz.quiz.currentIndex + 1}
              totalQuestions={chatQuiz.quiz.questions.length}
              selectedOption={chatQuiz.quiz.answers[chatQuiz.quiz.currentIndex]?.selected ?? null}
              showFeedback={chatQuiz.quiz.showFeedback}
              isLastQuestion={chatQuiz.quiz.currentIndex === chatQuiz.quiz.questions.length - 1}
              onSelectOption={quizMode.handleQuizSelectOption}
              onNext={quizMode.handleQuizNext}
              onExit={quizMode.handleQuizExit}
              isVisible={quizMode.quizModeActive}
            />
          )}
        </div>
      </div>

      {/* Quiz Review Modal */}
      {quizMode.isReviewModalOpen && quizMode.selectedQuizForReview && (
        <QuizReviewModal
          quiz={quizMode.selectedQuizForReview}
          isOpen={quizMode.isReviewModalOpen}
          onClose={quizMode.closeReviewModal}
          onRetry={quizMode.handleRetryQuiz}
        />
      )}
    </div>
  );
}
