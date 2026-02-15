/**
 * useSessionManagement Hook
 * AI Math Tutor v2
 *
 * Manages session CRUD: create, select, delete, clear chat,
 * mode changes, and initialization.
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ChatSession, TutorMode } from '@/types';
import {
  getUsername,
  getSessions,
  saveSession,
  createSession,
  deleteSession,
  getSettings,
  saveSettings,
  clearChatQuizState,
} from '@/lib/storage';

export function useSessionManagement() {
  const router = useRouter();

  // State
  const [username, setUsernameState] = useState<string | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [mode, setMode] = useState<TutorMode>('SHOW');
  const [mounted, setMounted] = useState(false);
  const [quizSessionId, setQuizSessionId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const storedSessions = getSessions();
      const settings = getSettings();
      if (settings.lastActiveSession) {
        const session = storedSessions.find(s => s.id === settings.lastActiveSession);
        if (session) return session.id;
      }
      if (storedSessions.length > 0) return storedSessions[0].id;
    }
    return '';
  });

  // Initialize
  useEffect(() => {
    const storedUsername = getUsername();
    if (!storedUsername) {
      router.push('/');
      return;
    }

    setUsernameState(storedUsername);

    const storedSessions = getSessions();
    setSessions(storedSessions);

    const settings = getSettings();
    setMode(settings.defaultMode);

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

    if (initialSession) {
      setQuizSessionId(initialSession.id);
    }

    setMounted(true);
  }, [router]);

  // Keep quizSessionId in sync with currentSession.id
  useEffect(() => {
    if (currentSession && currentSession.id !== quizSessionId) {
      setQuizSessionId(currentSession.id);
    }
  }, [currentSession?.id, quizSessionId]);

  // Create new chat session
  const handleNewChat = useCallback(() => {
    const newSession = createSession(mode);
    setCurrentSession(newSession);
    setSessions(prev => [newSession, ...prev]);
    saveSession(newSession);
    saveSettings({ lastActiveSession: newSession.id });
    setQuizSessionId(newSession.id);
    clearChatQuizState(newSession.id);
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

  // Clear current chat
  const handleClearChat = useCallback(() => {
    if (!currentSession) return;

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

  return {
    // State
    username,
    sessions,
    currentSession,
    mode,
    mounted,
    quizSessionId,

    // Setters (for page-level orchestration)
    setSessions,
    setCurrentSession,
    setMode,
    setQuizSessionId,

    // Actions
    handleNewChat,
    handleSelectSession,
    handleDeleteSession,
    handleModeChange,
    handleClearChat,
  };
}
