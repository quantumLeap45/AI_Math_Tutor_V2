'use client';

/**
 * ChatHeader Component
 * AI Math Tutor v2
 *
 * Header bar with sidebar toggles, logo, nav links,
 * mode toggle, quiz toggle, clear button, and theme toggle.
 */

import React from 'react';
import Link from 'next/link';
import { ModeToggle } from '@/components/ModeToggle';
import { ThemeToggle } from '@/components/ThemeToggle';
import { QuizModeToggle } from '@/components/QuizModeToggle';
import { TutorMode, ChatSession, ChatQuizState } from '@/types';

interface ChatHeaderProps {
  mode: TutorMode;
  onModeChange: (mode: TutorMode) => void;
  isLoading: boolean;
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  onOpenMobileSidebar: () => void;
  quizModeActive: boolean;
  onQuizModeToggle: () => void;
  isQuizLoading: boolean;
  chatQuizIsLoading: boolean;
  quiz: ChatQuizState | null;
  currentSession: ChatSession | null;
  onClearChat: () => void;
}

export function ChatHeader({
  mode,
  onModeChange,
  isLoading,
  sidebarCollapsed,
  onToggleSidebar,
  onOpenMobileSidebar,
  quizModeActive,
  onQuizModeToggle,
  isQuizLoading,
  chatQuizIsLoading,
  quiz,
  currentSession,
  onClearChat,
}: ChatHeaderProps) {
  return (
    <header className="sticky top-0 z-40 h-16 border-b border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
      <div className="h-full flex items-center justify-between px-4">
        {/* Left: Menu button, logo, and nav links */}
        <div className="flex items-center gap-2">
          {/* Mobile sidebar toggle */}
          <button
            onClick={onOpenMobileSidebar}
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
            onClick={onToggleSidebar}
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
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
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
              className="px-3 py-2 rounded-lg font-medium text-sm transition-colors relative text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            >
              Home
            </Link>
            <Link
              href="/chat"
              className="px-3 py-2 rounded-lg font-medium text-sm transition-colors relative text-emerald-600 dark:text-emerald-400"
              aria-current="page"
            >
              Chat
              <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-emerald-500 rounded-full" />
            </Link>
          </nav>
        </div>

        {/* Right: Mode toggle, Quiz Mode toggle, Clear Chat, and theme toggle */}
        <div className="flex items-center gap-2">
          <ModeToggle mode={mode} onChange={onModeChange} disabled={isLoading || (quizModeActive && !!quiz)} />

          <QuizModeToggle
            isActive={quizModeActive}
            onToggle={onQuizModeToggle}
            disabled={isLoading || isQuizLoading || chatQuizIsLoading}
            questionCount={quiz?.questions.length}
            currentQuestion={quiz ? quiz.currentIndex + 1 : undefined}
            isLocked={!!quiz && !quiz.isCompleted}
          />

          {currentSession && currentSession.messages.length > 0 && (
            <button
              onClick={onClearChat}
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
  );
}
