'use client';

/**
 * Chat Page
 * AI Math Tutor v2
 *
 * Thin orchestrator that wires together session management, quiz mode,
 * and daily quota hooks. Owns handleSendMessage and layout rendering.
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { ChatSidebar } from '@/components/ChatSidebar';
import { QuizPanel, QuizLoadingPanel, QuizReviewModal, ChatHeader, ChatMessagesArea } from '@/components/chat';
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

  // Sidebar UI state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Message sending state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Daily quota hook
  const { quotaStatus, countdown, consumeQuota, updateQuotaFromResponse } = useDailyQuota();

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

        const { level, topic, difficulty, questionCount } = parseQuizSettings(content);

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

          const aiMessage = createMessage(
            'assistant',
            `Great! I've prepared ${questionCount} ${level} questions for you to practice. You can ask me questions while you work through them.`
          );

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
        console.error('Chat error:', err);
        setError(err instanceof Error ? err.message : 'Something went wrong');
      } finally {
        setIsLoading(false);
      }
    },
    [sessionMgmt.currentSession, sessionMgmt.mode, consumeQuota, countdown, updateQuotaFromResponse, quizMode.quizModeActive, chatQuiz, chatQuiz.currentQuestion]
  );

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
      <ChatHeader
        mode={sessionMgmt.mode}
        onModeChange={sessionMgmt.handleModeChange}
        isLoading={isLoading}
        sidebarCollapsed={sidebarCollapsed}
        onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
        onOpenMobileSidebar={() => setSidebarOpen(true)}
        quizModeActive={quizMode.quizModeActive}
        onQuizModeToggle={quizMode.handleQuizModeToggle}
        isQuizLoading={quizMode.isQuizLoading}
        chatQuizIsLoading={chatQuiz.isLoading}
        quiz={chatQuiz.quiz}
        currentSession={sessionMgmt.currentSession}
        onClearChat={sessionMgmt.handleClearChat}
      />

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
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

        {/* Content wrapper: Chat area + optional Quiz Panel */}
        <div className="flex-1 flex overflow-hidden">
          <ChatMessagesArea
            currentSession={sessionMgmt.currentSession}
            quizModeActive={quizMode.quizModeActive}
            isQuizActive={quizMode.quizModeActive && (!!chatQuiz.quiz || quizMode.isQuizLoading)}
            isLoading={isLoading}
            isQuizLoading={quizMode.isQuizLoading}
            mode={sessionMgmt.mode}
            error={error}
            countdown={countdown}
            quotaStatus={quotaStatus}
            messagesEndRef={messagesEndRef}
            onSendMessage={handleSendMessage}
            onReviewQuiz={quizMode.handleReviewQuiz}
            onRetryQuiz={quizMode.handleRetryQuiz}
            onDismissError={() => setError(null)}
          />

          {/* Quiz Loading Panel — shown while generating questions */}
          {quizMode.isQuizLoading && quizMode.quizModeActive && (
            <QuizLoadingPanel
              isVisible={true}
              onCancel={() => {
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
