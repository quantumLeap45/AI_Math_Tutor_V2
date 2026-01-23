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
import { useTheme } from '@/components/ThemeProvider';
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

// Reusable Theme Toggle component (uses ThemeProvider)
function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      {theme === 'light' ? (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2" />
          <path d="M12 20v2" />
          <path d="m4.93 4.93 1.41 1.41" />
          <path d="m17.66 17.66 1.41 1.41" />
          <path d="M2 12h2" />
          <path d="M20 12h2" />
          <path d="m6.34 17.66-1.41 1.41" />
          <path d="m19.07 4.93-1.41 1.41" />
        </svg>
      )}
    </button>
  );
}

export default function ChatPage() {
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Daily quota hook
  const { quotaStatus, countdown, consumeQuota, updateQuotaFromResponse } = useDailyQuota();

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
    if (settings.lastActiveSession) {
      const lastSession = storedSessions.find(
        s => s.id === settings.lastActiveSession
      );
      if (lastSession) {
        setCurrentSession(lastSession);
      } else if (storedSessions.length > 0) {
        setCurrentSession(storedSessions[0]);
      }
    } else if (storedSessions.length > 0) {
      setCurrentSession(storedSessions[0]);
    }

    setMounted(true);
  }, [router]);

  // Auto-scroll on new messages
  useEffect(() => {
    scrollToBottom();
  }, [currentSession?.messages, scrollToBottom]);

  // Create new chat session
  const handleNewChat = useCallback(() => {
    const newSession = createSession(mode);
    setCurrentSession(newSession);
    setSessions(prev => [newSession, ...prev]);
    saveSession(newSession);
    saveSettings({ lastActiveSession: newSession.id });
  }, [mode]);

  // Select existing session
  const handleSelectSession = useCallback((sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (session) {
      setCurrentSession(session);
      setMode(session.mode);
      saveSettings({ lastActiveSession: sessionId });
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

      // Create session if needed
      let session = currentSession;
      if (!session) {
        session = createSession(mode);
        setCurrentSession(session);
        setSessions(prev => [session!, ...prev]);
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
    [currentSession, mode, consumeQuota, countdown, updateQuotaFromResponse]
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
              <Link
                href="/quiz"
                className="px-3 py-2 rounded-lg font-medium text-sm transition-colors relative text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Quiz
              </Link>
            </nav>
          </div>

          {/* Right: Mode toggle, Clear Chat, and theme toggle */}
          <div className="flex items-center gap-2">
            <ModeToggle mode={mode} onChange={handleModeChange} disabled={isLoading} />

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

        {/* Chat area */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4">
            {!currentSession || currentSession.messages.length === 0 ? (
              // Empty state
              <div className="h-full flex items-center justify-center">
                <div className="text-center max-w-md p-6">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                    <span className="text-white text-2xl">M</span>
                  </div>
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
                    Ready to learn math!
                  </h2>
                  <p className="text-slate-600 dark:text-slate-400 mb-4">
                    Ask me any Primary 1-6 math question. You can type or upload a
                    photo of your homework.
                  </p>
                  <div className="space-y-2 text-sm text-slate-500 dark:text-slate-400">
                    <p>Try asking:</p>
                    <ul className="space-y-1">
                      <li>&quot;What is 25 + 17?&quot;</li>
                      <li>&quot;Help me with fractions&quot;</li>
                      <li>&quot;How do I find the area of a rectangle?&quot;</li>
                    </ul>
                  </div>
                </div>
              </div>
            ) : (
              // Messages list
              <div className="max-w-3xl mx-auto">
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
              mode === 'TEACH'
                ? 'Type your question or share your attempt...'
                : 'Type your math question...'
            }
          />
        </main>
      </div>
    </div>
  );
}
