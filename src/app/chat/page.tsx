'use client';

/**
 * Chat Page
 * AI Math Tutor v2
 *
 * Main chat interface with sidebar, messages, and composer.
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { ChatSidebar } from '@/components/ChatSidebar';
import { MessageBubble } from '@/components/MessageBubble';
import { MessageComposer } from '@/components/MessageComposer';
import { ModeToggle } from '@/components/ModeToggle';
import { MessageLoading } from '@/components/LoadingSpinner';
import { ChatSession, Message, TutorMode } from '@/types';
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

export default function ChatPage() {
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // State
  const [username, setUsernameState] = useState<string | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [mode, setMode] = useState<TutorMode>('SHOW');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Scroll to bottom of messages
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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

  // Send message
  const handleSendMessage = useCallback(
    async (content: string, image?: string) => {
      if (!content.trim() && !image) return;

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
          throw new Error(errorData.error || 'Failed to get response');
        }

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
    [currentSession, mode]
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
      <header className="sticky top-0 z-40 w-full border-b border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
        <div className="flex items-center justify-between px-4 h-16">
          {/* Left: Menu button (mobile) and logo */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
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
                className="text-slate-600 dark:text-slate-400"
              >
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <Header username={username} showBackButton />
          </div>

          {/* Center: Mode toggle */}
          <ModeToggle mode={mode} onChange={handleModeChange} disabled={isLoading} />

          {/* Right: Spacer for balance */}
          <div className="w-10" />
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
          onClose={() => setSidebarOpen(false)}
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
                {currentSession.messages.map(message => (
                  <MessageBubble key={message.id} message={message} />
                ))}
                {isLoading && <MessageLoading />}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Error message */}
          {error && (
            <div className="px-4 py-2 bg-red-50 dark:bg-red-900/20 border-t border-red-200 dark:border-red-800">
              <p className="text-sm text-red-600 dark:text-red-400 text-center">
                {error}
                <button
                  onClick={() => setError(null)}
                  className="ml-2 underline hover:no-underline"
                >
                  Dismiss
                </button>
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
