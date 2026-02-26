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
