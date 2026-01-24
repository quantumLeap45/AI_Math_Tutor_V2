'use client';

/**
 * Chat Page
 * AI Math Tutor v2
 *
 * Main chat interface with sidebar, messages, and composer.
 * Updated for Phase 2 with refined header styling.
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChatSidebar } from '@/components/ChatSidebar';
import { MessageBubble } from '@/components/MessageBubble';
import { MessageComposer } from '@/components/MessageComposer';
import { ModeToggle } from '@/components/ModeToggle';
import { MessageLoading } from '@/components/LoadingSpinner';
import { ThemeToggle } from '@/components/ThemeToggle';
import { QuizModeToggle } from '@/components/QuizModeToggle';
import { QuizPanel } from '@/components/chat';
import { ChatSession, TutorMode } from '@/types';
import {
  getUsername,
  getSessions,
  saveSession,
  createSession,
  deleteSession,
  getSettings,
  saveSettings,
} from '@/lib/storage';
import { createMessage, updateSessionTitleFromFirstMessage } from '@/lib/chat';
import { useDailyQuota } from '@/hooks/useDailyQuota';
import { useChatQuiz } from '@/hooks';

export default function ChatPage() {
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Daily quota hook
  const { quotaStatus, countdown, consumeQuota, updateQuotaFromResponse } = useDailyQuota();

  // Chat quiz hook (initialized when we have a session ID)
  const [quizSessionId, setQuizSessionId] = useState<string>('');
  const chatQuiz = useChatQuiz({ sessionId: quizSessionId });

  // State
  const [username, setUsernameState] = useState<string | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [mode, setMode] = useState<TutorMode>('SHOW');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Quiz mode state
  const [quizModeActive, setQuizModeActive] = useState(false);
  const [showQuizResults, setShowQuizResults] = useState(false);

  // Scroll to bottom of messages (scroll the messages container, not the page)
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, []);

  // Initialize
  useEffect(() => {
    const storedUsername = getUsername();
    if (!storedUsername) {
      router.push('/');
      return;
    }

    setUsernameState(storedUsername);

    // Load sessions
    const storedSessions = getSessions();
    setSessions(storedSessions);

    // Load settings
    const settings = getSettings();
    setMode(settings.defaultMode);

    // Set current session
    let initialSession: ChatSession | null = null;
    if (settings.lastActiveSession) {
      const lastSession = storedSessions.find(
        s => s.id === settings.lastActiveSession
      );
      if (lastSession) {
        initialSession = lastSession;
        setCurrentSession(lastSession);
      } else if (storedSessions.length > 0) {
        initialSession = storedSessions[0];
        setCurrentSession(storedSessions[0]);
      }
    } else if (storedSessions.length > 0) {
      initialSession = storedSessions[0];
      setCurrentSession(storedSessions[0]);
    }

    // Initialize quiz session ID
    if (initialSession) {
      setQuizSessionId(initialSession.id);
    }

    setMounted(true);
  }, [router]);

  // Auto-scroll on new messages
  useEffect(() => {
    scrollToBottom();
  }, [currentSession?.messages, scrollToBottom]);

  // Auto-collapse sidebar when quiz mode is activated (once)
  const [hasAutoCollapsed, setHasAutoCollapsed] = useState(false);

  useEffect(() => {
    if (quizModeActive && !hasAutoCollapsed) {
      // Save current state and collapse (only once when quiz activates)
      setSidebarCollapsed(true);
      setHasAutoCollapsed(true);
      // Also close mobile sidebar if open
      setSidebarOpen(false);
    } else if (!quizModeActive) {
      // Reset the auto-collapse flag when quiz ends
      setHasAutoCollapsed(false);
    }
  }, [quizModeActive, hasAutoCollapsed]);

  // Create new chat session
  const handleNewChat = useCallback(() => {
    const newSession = createSession(mode);
    setCurrentSession(newSession);
    setSessions(prev => [newSession, ...prev]);
    saveSession(newSession);
    saveSettings({ lastActiveSession: newSession.id });
    setQuizSessionId(newSession.id);
  }, [mode]);

  // Select existing session
  const handleSelectSession = useCallback((sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (session) {
      setCurrentSession(session);
      setMode(session.mode);
      saveSettings({ lastActiveSession: sessionId });
      setQuizSessionId(sessionId);
    }
  }, [sessions]);

  // Delete session
  const handleDeleteSession = useCallback(
    (sessionId: string) => {
      deleteSession(sessionId);
      const updatedSessions = sessions.filter(s => s.id !== sessionId);
      setSessions(updatedSessions);

      // If deleted current session, select another
      if (currentSession?.id === sessionId) {
        if (updatedSessions.length > 0) {
          setCurrentSession(updatedSessions[0]);
          saveSettings({ lastActiveSession: updatedSessions[0].id });
        } else {
          setCurrentSession(null);
          saveSettings({ lastActiveSession: undefined });
        }
      }
    },
    [sessions, currentSession]
  );

  // Change mode
  const handleModeChange = useCallback(
    (newMode: TutorMode) => {
      setMode(newMode);
      saveSettings({ defaultMode: newMode });

      // Update current session mode
      if (currentSession) {
        const updatedSession = { ...currentSession, mode: newMode };
        setCurrentSession(updatedSession);
        saveSession(updatedSession);
        setSessions(prev =>
          prev.map(s => (s.id === updatedSession.id ? updatedSession : s))
        );
      }
    },
    [currentSession]
  );

  // Clear current chat (remove all messages from current session)
  const handleClearChat = useCallback(() => {
    if (!currentSession) return;

    // Keep the same session but clear all messages
    const clearedSession: ChatSession = {
      ...currentSession,
      messages: [],
      title: 'New Chat',
      updatedAt: new Date().toISOString(),
    };

    setCurrentSession(clearedSession);
    saveSession(clearedSession);
    setSessions(prev =>
      prev.map(s => (s.id === clearedSession.id ? clearedSession : s))
    );
  }, [currentSession]);

  // ============ QUIZ MODE HANDLERS ============

  // Toggle quiz mode on/off
  const handleQuizModeToggle = useCallback(async () => {
    // If quiz is active, button is locked - do nothing (user must use Exit Quiz button)
    if (quizModeActive || chatQuiz.quiz) {
      // Quiz is running - button is locked, ignore click
      return;
    }
    // Activate quiz mode - user will type their request
    setQuizModeActive(true);
    setShowQuizResults(false);
  }, [quizModeActive, chatQuiz.quiz]);

  // Handle quiz exit
  const handleQuizExit = useCallback(() => {
    chatQuiz.exitQuiz();
    setQuizModeActive(false);
    setShowQuizResults(false);
  }, [chatQuiz]);

  // Handle option selection in quiz
  const handleQuizSelectOption = useCallback((option: 'A' | 'B' | 'C' | 'D') => {
    chatQuiz.selectOption(option);
  }, [chatQuiz]);

  // Handle quiz next button
  const handleQuizNext = useCallback(() => {
    const quiz = chatQuiz.quiz;
    if (!quiz) return;

    // Check if this is the last question and we need to complete
    const isLastQuestion = quiz.currentIndex === quiz.questions.length - 1;

    if (isLastQuestion && quiz.showFeedback) {
      // Quiz is complete, show results
      setShowQuizResults(true);
      setQuizModeActive(false);
    } else {
      // Move to next question or show feedback
      chatQuiz.nextQuestion();
    }
  }, [chatQuiz]);

  // ============ END QUIZ MODE HANDLERS ============

  // Send message
  const handleSendMessage = useCallback(
    async (content: string, image?: string) => {
      if (!content.trim() && !image) return;

      // Check daily quota before sending
      const quotaResult = consumeQuota();
      if (!quotaResult.allowed) {
        setError(`Daily limit reached. Quota resets in ${countdown?.formatted || '24:00:00'}.`);
        return;
      }

      setError(null);

      // Check if user is requesting a quiz in quiz mode
      if (quizModeActive && currentSession) {
        // Parse the request for quiz parameters
        const levelMatch = content.match(/\b(P[1-6])\b/i);
        const topic = content.replace(/quiz|question|give me|generate|create|questions?/gi, '').trim() || 'math';

        const level = (levelMatch?.[1]?.toUpperCase() || 'P2') as 'P1' | 'P2' | 'P3' | 'P4' | 'P5' | 'P6';
        const questionCount = ([5, 10, 15, 20].find(n => content.includes(n.toString())) || 5) as 5 | 10 | 15 | 20;

        // Add user message to chat (note: images are not supported in quiz mode)
        const userMessage = createMessage('user', content);
        const updatedSession = {
          ...currentSession,
          messages: [...currentSession.messages, userMessage],
          updatedAt: new Date().toISOString(),
        };

        setCurrentSession(updatedSession);
        saveSession(updatedSession);
        setSessions(prev =>
          prev.map(s => (s.id === updatedSession.id ? updatedSession : s))
        );

        // Call startQuiz from the hook (it handles the API call internally)
        setIsLoading(true);
        try {
          await chatQuiz.startQuiz({
            level,
            topics: [topic],
            difficulty: 'all',
            questionCount,
          });

          // Add AI message confirming quiz start
          const aiMessage = createMessage(
            'assistant',
            `I've generated ${questionCount} ${level} questions on **${topic}**. Let's begin! You can ask me questions while you work through them.`
          );

          const sessionWithAI = {
            ...updatedSession,
            messages: [...updatedSession.messages, aiMessage],
            updatedAt: new Date().toISOString(),
          };

          setCurrentSession(sessionWithAI);
          saveSession(sessionWithAI);
          setSessions(prev =>
            prev.map(s => (s.id === sessionWithAI.id ? sessionWithAI : s))
          );
        } catch (error) {
          console.error('Quiz generation error:', error);
          setError('Failed to generate quiz. Please try again.');
        } finally {
          setIsLoading(false);
        }
        return;
      }

      // Create session if needed
      let session = currentSession;
      if (!session) {
        session = createSession(mode);
        setCurrentSession(session);
        setSessions(prev => [session!, ...prev]);
        setQuizSessionId(session.id);
      }

      // Add user message
      const userMessage = createMessage('user', content, image);
      const updatedSession: ChatSession = {
        ...session,
        mode,
        messages: [...session.messages, userMessage],
        updatedAt: new Date().toISOString(),
      };

      // Update title from first message
      const sessionWithTitle = updateSessionTitleFromFirstMessage(updatedSession);

      setCurrentSession(sessionWithTitle);
      setSessions(prev =>
        prev.map(s => (s.id === sessionWithTitle.id ? sessionWithTitle : s))
      );
      saveSession(sessionWithTitle);
      saveSettings({ lastActiveSession: sessionWithTitle.id });

      // Call API
      setIsLoading(true);

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: sessionWithTitle.messages,
            mode,
            image,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          // Update quota status from response headers even on error
          updateQuotaFromResponse(response);
          throw new Error(errorData.error || 'Failed to get response');
        }

        // Update quota status from response headers
        updateQuotaFromResponse(response);

        // Handle streaming response
        const reader = response.body?.getReader();
        if (!reader) throw new Error('No response body');

        const decoder = new TextDecoder();
        let assistantContent = '';

        // Create placeholder assistant message
        const assistantMessage = createMessage('assistant', '');
        let sessionWithAssistant: ChatSession = {
          ...sessionWithTitle,
          messages: [...sessionWithTitle.messages, assistantMessage],
          updatedAt: new Date().toISOString(),
        };

        setCurrentSession(sessionWithAssistant);

        // Stream the response
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          assistantContent += chunk;

          // Update the assistant message content
          sessionWithAssistant = {
            ...sessionWithAssistant,
            messages: sessionWithAssistant.messages.map((m, i) =>
              i === sessionWithAssistant.messages.length - 1
                ? { ...m, content: assistantContent }
                : m
            ),
            updatedAt: new Date().toISOString(),
          };

          setCurrentSession(sessionWithAssistant);
        }

        // Save final state
        setSessions(prev =>
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
    [currentSession, mode, consumeQuota, countdown, updateQuotaFromResponse, quizModeActive, chatQuiz]
  );

  // Loading state
  if (!mounted || !username) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-900">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-white dark:bg-slate-900">
      {/* Header with mode toggle */}
      <header className="sticky top-0 z-40 h-16 border-b border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
        <div className="h-full flex items-center justify-between px-4">
          {/* Left: Menu button, logo, and nav links */}
          <div className="flex items-center gap-2">
            {/* Mobile sidebar toggle */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
              aria-label="Open sidebar"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            {/* Desktop sidebar toggle */}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="hidden lg:flex p-2 -ml-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
              aria-label={sidebarCollapsed ? "Open sidebar" : "Close sidebar"}
            >
              {sidebarCollapsed ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="11 17 6 12 11 7" />
                  <polyline points="17 17 12 12 17 7" />
                </svg>
              )}
            </button>
            <Link href="/home" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                <span className="text-white font-bold text-lg">M</span>
              </div>
              <span className="hidden sm:block text-lg font-semibold text-slate-900 dark:text-slate-100">
                AI Math Tutor
              </span>
            </Link>

            {/* Nav links - hidden on small mobile */}
            <nav className="hidden md:flex items-center gap-1 ml-2" aria-label="Main navigation">
              <Link
                href="/home"
                className="px-3 py-2 rounded-lg font-medium text-sm transition-colors relative text-blue-600 dark:text-blue-400"
                aria-current="page"
              >
                Home
                <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-blue-500 rounded-full" />
              </Link>
              <Link
                href="/chat"
                className="px-3 py-2 rounded-lg font-medium text-sm transition-colors relative text-blue-600 dark:text-blue-400"
                aria-current="page"
              >
                Chat
                <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-blue-500 rounded-full" />
              </Link>
            </nav>
          </div>

          {/* Right: Mode toggle, Quiz Mode toggle, Clear Chat, and theme toggle */}
          <div className="flex items-center gap-2">
            <ModeToggle mode={mode} onChange={handleModeChange} disabled={isLoading} />

            <QuizModeToggle
              isActive={quizModeActive}
              onToggle={handleQuizModeToggle}
              disabled={isLoading || chatQuiz.isLoading}
              questionCount={chatQuiz.quiz?.questions.length}
              currentQuestion={chatQuiz.quiz ? chatQuiz.quiz.currentIndex + 1 : undefined}
              isLocked={!!chatQuiz.quiz}
            />

            {currentSession && currentSession.messages.length > 0 && (
              <button
                onClick={handleClearChat}
                disabled={isLoading}
                className="px-3 py-2 rounded-lg font-medium text-sm transition-colors text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                title="Clear current chat"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 6h18" />
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                </svg>
                <span className="hidden sm:inline">Clear</span>
              </button>
            )}
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <ChatSidebar
          sessions={sessions}
          currentSessionId={currentSession?.id}
          onNewChat={handleNewChat}
          onSelectSession={handleSelectSession}
          onDeleteSession={handleDeleteSession}
          isOpen={sidebarOpen}
          collapsed={sidebarCollapsed}
          onClose={() => setSidebarOpen(false)}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />

        {/* Content wrapper: Chat area + optional Quiz Panel */}
        <div className="flex-1 flex overflow-hidden">
          {/* Chat area */}
          <main className="flex-1 flex flex-col overflow-hidden min-w-0 min-w-[300px]">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4">
            {!currentSession || currentSession.messages.length === 0 ? (
              // Empty state
              <div className="h-full flex items-center justify-center">
                <div className="text-center max-w-md p-6">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                    {quizModeActive ? (
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ) : (
                      <span className="text-white text-2xl">M</span>
                    )}
                  </div>
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
                    {quizModeActive ? 'Quiz Mode Active!' : 'Ready to learn math!'}
                  </h2>
                  <p className="text-slate-600 dark:text-slate-400 mb-4">
                    {quizModeActive
                      ? 'Type your quiz request below. Tell me the topic, level, and how many questions you want.'
                      : 'Ask me any Primary 1-6 math question. You can type or upload a photo of your homework.'
                    }
                  </p>
                  {quizModeActive ? (
                    <div className="space-y-2 text-sm text-slate-500 dark:text-slate-400">
                      <p>Try typing:</p>
                      <ul className="space-y-1">
                        <li>&quot;Give me 5 P2 fractions questions&quot;</li>
                        <li>&quot;Generate 10 P4 geometry questions&quot;</li>
                        <li>&quot;I want 15 P6 algebra problems&quot;</li>
                      </ul>
                    </div>
                  ) : (
                    <div className="space-y-2 text-sm text-slate-500 dark:text-slate-400">
                      <p>Try asking:</p>
                      <ul className="space-y-1">
                        <li>&quot;What is 25 + 17?&quot;</li>
                        <li>&quot;Help me with fractions&quot;</li>
                        <li>&quot;How do I find the area of a rectangle?&quot;</li>
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              // Messages list
              <div className={quizModeActive ? "max-w-2xl mx-auto px-4" : "max-w-3xl mx-auto"}>
                {currentSession.messages.map((message, index) => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    quotaInfo={message.role === 'assistant' && index === currentSession.messages.length - 1 ? {
                      remaining: quotaStatus.remaining,
                      limit: quotaStatus.limit
                    } : undefined}
                  />
                ))}
                {isLoading && <MessageLoading />}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Error message */}
          {error && (
            <div
              className={`px-4 py-2 border-t ${
                error.includes('Daily limit')
                  ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
                  : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
              }`}
            >
              <p
                className={`text-sm text-center ${
                  error.includes('Daily limit')
                    ? 'text-amber-700 dark:text-amber-300'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                {error.includes('Daily limit') ? (
                  <>
                    <span className="font-medium">Daily limit reached</span>
                    {countdown && (
                      <span>
                        {' '}• Resets in{' '}
                        <span className="font-mono font-bold">{countdown.formatted}</span>
                      </span>
                    )}
                    <button
                      onClick={() => setError(null)}
                      className="ml-2 underline hover:no-underline"
                    >
                      Dismiss
                    </button>
                  </>
                ) : (
                  <>
                    {error}
                    <button
                      onClick={() => setError(null)}
                      className="ml-2 underline hover:no-underline"
                    >
                      Dismiss
                    </button>
                  </>
                )}
              </p>
            </div>
          )}

          {/* Composer */}
          <MessageComposer
            onSend={handleSendMessage}
            disabled={isLoading}
            placeholder={
              quizModeActive
                ? 'Type your quiz request (e.g., "Give me 5 P2 fractions questions")...'
                : mode === 'TEACH'
                ? 'Type your question or share your attempt...'
                : 'Type your math question...'
            }
          />
        </main>

        {/* Quiz Panel - side-by-side with chat */}
        {quizModeActive && chatQuiz.quiz && chatQuiz.currentQuestion && (
          <QuizPanel
            currentQuestion={chatQuiz.currentQuestion}
            questionNumber={chatQuiz.quiz.currentIndex + 1}
            totalQuestions={chatQuiz.quiz.questions.length}
            selectedOption={chatQuiz.quiz.answers[chatQuiz.quiz.currentIndex]?.selected ?? null}
            showFeedback={chatQuiz.quiz.showFeedback}
            isLastQuestion={chatQuiz.quiz.currentIndex === chatQuiz.quiz.questions.length - 1}
            onSelectOption={handleQuizSelectOption}
            onNext={handleQuizNext}
            onExit={handleQuizExit}
            isVisible={quizModeActive}
          />
        )}
        </div>
      </div>

      {/* Quiz Results Modal */}
      {showQuizResults && chatQuiz.quiz && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                Quiz Complete!
              </h2>
              <p className="text-slate-600 dark:text-slate-400 mb-6">
                You've completed the quiz. Great job practicing!
              </p>

              {/* Score */}
              <div className="bg-slate-100 dark:bg-slate-700 rounded-xl p-4 mb-6">
                <div className="text-4xl font-bold text-blue-600 dark:text-blue-400 mb-1">
                  {chatQuiz.quiz.answers.filter(a => a.isCorrect).length}/{chatQuiz.quiz.questions.length}
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Questions Correct
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={handleQuizExit}
                  className="flex-1 py-3 rounded-lg font-semibold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={async () => {
                    handleQuizExit();
                    await handleQuizModeToggle();
                  }}
                  className="flex-1 py-3 rounded-lg font-semibold bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:shadow-lg transition-all"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
