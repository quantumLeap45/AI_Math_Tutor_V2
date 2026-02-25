'use client';

/**
 * ChatHeader Component
 * AI Math Tutor v2
 *
 * Header bar with sidebar toggles, logo, credits badge,
 * quiz toggle, clear button, and theme toggle.
 * Show/Teach controls remain in the MessageComposer.
 */

import React from 'react';
import Link from 'next/link';
import { ThemeToggle } from '@/components/ThemeToggle';
import { ChatSession } from '@/types';

interface ChatHeaderProps {
  isLoading: boolean;
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  onOpenMobileSidebar: () => void;
  currentSession: ChatSession | null;
  onClearChat: () => void;
  quotaRemaining: number;
  quotaLimit: number;
  quotaLoaded: boolean;
  quizModeActive: boolean;
  onQuizModeToggle: () => void;
  quizDisabled: boolean;
  quizLocked: boolean;
  quizCurrentQuestion?: number;
  quizTotalQuestions?: number;
}

export function ChatHeader({
  isLoading,
  sidebarCollapsed,
  onToggleSidebar,
  onOpenMobileSidebar,
  currentSession,
  onClearChat,
  quotaRemaining,
  quotaLimit,
  quotaLoaded,
  quizModeActive,
  onQuizModeToggle,
  quizDisabled,
  quizLocked,
  quizCurrentQuestion,
  quizTotalQuestions,
}: ChatHeaderProps) {
  const quizTooltip = quizLocked
    ? 'Quiz running — use Exit Quiz in panel'
    : quizModeActive
    ? 'Exit quiz mode'
    : 'Start quiz mode';

  return (
    <header className="sticky top-0 z-40 h-14 border-b border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
      <div className="h-full flex items-center justify-between px-4">
        {/* Left: Menu button, logo, and nav links */}
        <div className="flex items-center gap-2">
          {/* Mobile sidebar toggle */}
          <button
            onClick={onOpenMobileSidebar}
            className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
            aria-label="Open sidebar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="11 17 6 12 11 7" />
                <polyline points="17 17 12 12 17 7" />
              </svg>
            )}
          </button>
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center">
              <span className="text-white font-bold text-lg">M</span>
            </div>
            <span className="hidden sm:block text-lg font-semibold text-slate-900 dark:text-slate-100">
              AI Math Tutor
            </span>
          </Link>
        </div>

        {/* Right: Credits badge, Clear Chat, and theme toggle */}
        <div className="flex items-center gap-2">
          {/* Credits badge */}
          {quotaLoaded && (
            <div
              className="group relative px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 cursor-default"
            >
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Unlimited
              </span>
              {/* Tooltip */}
              <div className="absolute top-full right-0 mt-2 hidden group-hover:block w-48 p-2 bg-slate-900 dark:bg-slate-700 text-white text-xs rounded-lg shadow-lg z-50">
                <div className="font-medium mb-1">Messages</div>
                <div className="text-slate-300">
                  Unlimited during early access.
                </div>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={onQuizModeToggle}
            disabled={quizDisabled || quizLocked}
            className={`
              relative px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium
              transition-colors flex items-center gap-1.5
              ${(quizDisabled || quizLocked)
                ? 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500'
                : quizModeActive
                ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }
            `}
            title={quizTooltip}
            aria-pressed={quizModeActive}
            aria-label="Quiz mode"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 11l3 3L22 4" />
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
            <span className="hidden sm:inline">Quiz Mode</span>
            {quizModeActive &&
              typeof quizCurrentQuestion === 'number' &&
              typeof quizTotalQuestions === 'number' &&
              quizTotalQuestions > 0 && (
                <span className="rounded-full bg-white/25 px-1.5 py-0.5 text-[10px] sm:text-xs font-semibold tabular-nums">
                  {quizCurrentQuestion}/{quizTotalQuestions}
                </span>
              )}
          </button>

          {currentSession && currentSession.messages.length > 0 && (
            <button
              onClick={onClearChat}
              disabled={isLoading}
              className="p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Clear current chat"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18" />
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
              </svg>
            </button>
          )}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
