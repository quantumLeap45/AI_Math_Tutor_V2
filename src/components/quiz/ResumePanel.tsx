'use client';

/**
 * Resume Panel Component
 * AI Math Tutor v2
 *
 * Displays saved quiz information with Resume and Discard buttons.
 * Shows empty state when no quiz is in progress.
 */

import React, { useState } from 'react';
import { QuizAttempt } from '@/types';
import { DiscardDialog } from './DiscardDialog';

interface ResumePanelProps {
  quiz: QuizAttempt;
  onResume: () => void;
  onDiscard: () => void;
}

/**
 * Format relative time (e.g., "5 mins ago", "2 hours ago")
 */
function formatRelativeTime(isoString: string | undefined): string {
  if (!isoString) return 'Unknown';

  const savedTime = new Date(isoString).getTime();
  const now = Date.now();
  const diffMs = now - savedTime;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min${diffMins === 1 ? '' : 's'} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
}

/**
 * Get topic display text
 */
function getTopicDisplay(topics: string[]): string {
  if (topics.length === 0 || topics.length === 6) return 'All Topics';
  if (topics.length === 1) return topics[0];
  return `${topics.length} Topics`;
}

export function ResumePanel({ quiz, onResume, onDiscard }: ResumePanelProps) {
  const [isDiscardDialogOpen, setIsDiscardDialogOpen] = useState(false);

  // Calculate progress
  const currentQuestion = quiz.currentIndex + 1;
  const totalQuestions = quiz.questions.length;
  const progressPercent = Math.round((currentQuestion / totalQuestions) * 100);
  const topics = quiz.config.topics;
  const difficulty = quiz.config.difficulty || 'all';
  const difficultyLabel = difficulty === 'all' ? 'All Levels' : difficulty.charAt(0).toUpperCase() + difficulty.slice(1);

  const handleDiscardClick = () => {
    setIsDiscardDialogOpen(true);
  };

  const handleConfirmDiscard = () => {
    setIsDiscardDialogOpen(false);
    onDiscard();
  };

  return (
    <>
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
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
                className="text-white"
              >
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Resume Quiz</h3>
              <p className="text-sm text-white/80">Continue where you left off</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Progress bar */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Progress</span>
              <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Q {currentQuestion}/{totalQuestions}
              </span>
            </div>
            <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Quiz details */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
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
                  className="text-blue-600 dark:text-blue-400"
                >
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-500">Topic</p>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  {getTopicDisplay(topics)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
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
                  className="text-purple-600 dark:text-purple-400"
                >
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-500">Difficulty</p>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  {difficultyLabel}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
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
                  className="text-green-600 dark:text-green-400"
                >
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-500">Last Saved</p>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  {formatRelativeTime(quiz.lastSavedAt)}
                </p>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onResume}
              className="flex-1 py-3 px-4 rounded-xl font-semibold text-white bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
            >
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
              >
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              Resume
            </button>
            <button
              onClick={handleDiscardClick}
              className="py-3 px-4 rounded-xl font-medium text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
              aria-label="Discard quiz progress"
            >
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
              >
                <path d="M3 6h18" />
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Discard confirmation dialog */}
      <DiscardDialog
        isOpen={isDiscardDialogOpen}
        onClose={() => setIsDiscardDialogOpen(false)}
        onConfirm={handleConfirmDiscard}
        progress={`${currentQuestion} of ${totalQuestions}`}
      />
    </>
  );
}
