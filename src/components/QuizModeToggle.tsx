'use client';

/**
 * Quiz Mode Toggle Button Component
 * AI Math Tutor v2
 *
 * Toggle button to switch between regular chat mode and quiz mode.
 * When active, displays the quiz panel for answering questions.
 */

import React from 'react';

interface QuizModeToggleProps {
  /** Whether quiz mode is currently active */
  isActive: boolean;
  /** Callback when toggle is clicked */
  onToggle: () => void;
  /** Whether the toggle is disabled */
  disabled?: boolean;
  /** Optional count of questions in quiz (displays when active) */
  questionCount?: number;
  /** Current question number (displays when active) */
  currentQuestion?: number;
  /** Whether a quiz is currently running (button is locked) */
  isLocked?: boolean;
}

export function QuizModeToggle({
  isActive,
  onToggle,
  disabled = false,
  questionCount,
  currentQuestion,
  isLocked = false,
}: QuizModeToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled || isLocked}
      className={`
        relative px-4 py-2 rounded-lg font-medium text-sm
        transition-all duration-200 flex items-center gap-2
        ${disabled || isLocked
          ? 'opacity-70 cursor-not-allowed bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500'
          : isActive
          ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-md hover:shadow-lg'
          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
        }
      `}
      aria-pressed={isActive}
      title={isLocked
        ? 'Quiz running - use Exit Quiz button to close'
        : isActive
        ? 'Exit quiz mode'
        : 'Start quiz mode - Click here to generate interactive quizzes with AI'
      }
    >
      {/* Quiz icon */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="flex-shrink-0"
      >
        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
        <polyline points="14 2 14 8 20 8" />
        <path d="M9 15l2 2 4-4" />
      </svg>

      {/* Button text */}
      <span>{isActive ? 'Quiz Mode' : 'Quiz'}</span>

      {/* Question progress badge (when active) */}
      {isActive && currentQuestion !== undefined && questionCount !== undefined && (
        <span className="
          hidden sm:inline-flex items-center justify-center
          px-2 py-0.5 rounded-full text-xs font-semibold
          bg-white/20 backdrop-blur-sm
        ">
          {currentQuestion}/{questionCount}
        </span>
      )}

      {/* Active indicator dot */}
      {isActive && !isLocked && (
        <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white dark:border-slate-900 animate-pulse" />
      )}

      {/* Lock icon when quiz is running */}
      {isLocked && (
        <svg
          className="absolute -top-1 -right-1 w-3 h-3 text-slate-500"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
            clipRule="evenodd"
          />
        </svg>
      )}
    </button>
  );
}
