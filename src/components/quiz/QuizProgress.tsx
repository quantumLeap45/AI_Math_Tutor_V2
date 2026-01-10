'use client';

/**
 * Quiz Progress Component
 * AI Math Tutor v2
 *
 * Displays progress through the quiz including:
 * - Current question indicator
 * - Progress bar
 * - Elapsed time
 * - Question navigation dots
 */

import React from 'react';
import { formatDuration } from '@/types';

interface QuizProgressProps {
  currentIndex: number;
  totalQuestions: number;
  elapsed: number; // in seconds
  answers?: Array<{ selected: string | null; isCorrect: boolean }>;
  onNavigateTo?: (index: number) => void;
}

export function QuizProgress({
  currentIndex,
  totalQuestions,
  elapsed,
  answers,
  onNavigateTo,
}: QuizProgressProps) {
  const progress = ((currentIndex + 1) / totalQuestions) * 100;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 mb-6">
      {/* Top row: Question counter and time */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
            Question
          </span>
          <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
            {currentIndex + 1}
          </span>
          <span className="text-sm text-slate-500 dark:text-slate-500">
            / {totalQuestions}
          </span>
        </div>

        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <span className="font-mono">{formatDuration(elapsed * 1000)}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="relative h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden mb-4">
        <div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Navigation dots */}
      {onNavigateTo && (
        <div className="flex items-center justify-center gap-1.5 flex-wrap">
          {Array.from({ length: totalQuestions }, (_, i) => {
            let dotClass = '';
            let clickHandler: (() => void) | undefined = () => onNavigateTo(i);

            // Determine dot style based on answer status and current position
            if (i === currentIndex) {
              // Current question
              dotClass = 'bg-blue-500 ring-4 ring-blue-100 dark:ring-blue-900/30 scale-110';
            } else if (answers && answers[i]?.selected !== null) {
              // Answered question
              if (answers[i]?.isCorrect) {
                dotClass = 'bg-green-500 hover:bg-green-600';
              } else {
                dotClass = 'bg-red-500 hover:bg-red-600';
              }
            } else if (i < currentIndex) {
              // Skipped question
              dotClass = 'bg-amber-500 hover:bg-amber-600';
            } else {
              // Future question
              dotClass = 'bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600';
            }

            // Prevent navigating to future questions
            if (i > currentIndex) {
              clickHandler = undefined;
            }

            return (
              <button
                key={i}
                onClick={clickHandler}
                disabled={i > currentIndex}
                className={`
                  w-3 h-3 rounded-full transition-all duration-150
                  ${dotClass}
                  ${i > currentIndex ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
                `}
                aria-label={`Go to question ${i + 1}`}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

// Compact version for use during quiz (smaller, no nav dots)
interface QuizProgressCompactProps {
  currentIndex: number;
  totalQuestions: number;
  elapsed: number;
}

export function QuizProgressCompact({
  currentIndex,
  totalQuestions,
  elapsed,
}: QuizProgressCompactProps) {
  const progress = ((currentIndex + 1) / totalQuestions) * 100;

  return (
    <div className="flex items-center gap-4 mb-6">
      {/* Question counter */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
          Question
        </span>
        <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
          {currentIndex + 1}
        </span>
        <span className="text-sm text-slate-500 dark:text-slate-500">
          / {totalQuestions}
        </span>
      </div>

      {/* Progress bar */}
      <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Timer */}
      <div className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        <span className="font-mono">{formatDuration(elapsed * 1000)}</span>
      </div>
    </div>
  );
}
