'use client';

/**
 * Quiz Summary Card Component
 * AI Math Tutor v2
 *
 * Compact summary card displayed after quiz completion.
 * Shows score, accuracy, time taken, quiz details, and action buttons.
 */

import React from 'react';

export type Level = 'P1' | 'P2' | 'P3' | 'P4' | 'P5' | 'P6';
export type Difficulty = 'easy' | 'medium' | 'hard' | 'A1';

interface QuizSummaryCardProps {
  score: number;
  totalQuestions: number;
  percentage: number;
  timeTaken: string;
  level: Level;
  difficulty: Difficulty;
  topic: string;
  retryAttempt?: number;
  onReview?: () => void;
  onRetry?: () => void;
}

export function QuizSummaryCard({
  score,
  totalQuestions,
  percentage,
  timeTaken,
  level,
  difficulty,
  topic,
  retryAttempt = 0,
  onReview = () => {},
  onRetry = () => {},
}: QuizSummaryCardProps) {
  const isRetry = retryAttempt > 0;
  const retryLabel = isRetry ? `🔄 Retry #${retryAttempt}: ` : '';

  return (
    <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
      {/* Header with checkmark and title */}
      <div className="flex items-center gap-3 mb-3">
        <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white font-bold">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{retryLabel}Quiz Complete!</h3>
      </div>

      {/* Score and accuracy */}
      <div className="flex items-center gap-6 mb-3">
        <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
          {score}/{totalQuestions} <span className="text-slate-600 dark:text-slate-400">Score</span>
        </div>
        <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
          {percentage}% <span className="text-slate-600 dark:text-slate-400">Accuracy</span>
        </div>
      </div>

      {/* Quiz details */}
      <div className="flex items-center gap-4 text-sm mb-4 text-slate-600 dark:text-slate-400">
        <span className="flex items-center gap-1">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          {timeTaken}
        </span>
        <span>•</span>
        <span>{level} {difficulty}</span>
        <span>•</span>
        <span>{topic}</span>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          onClick={onReview}
          className="flex-1 py-2 px-4 rounded-lg font-medium bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
        >
          Review Quiz
        </button>
        <button
          onClick={onRetry}
          className="flex-1 py-2 px-4 rounded-lg font-medium bg-blue-500 text-white hover:bg-blue-600 transition-colors"
        >
          Retry Quiz
        </button>
      </div>
    </div>
  );
}

export default QuizSummaryCard;
