'use client';

/**
 * Quiz Question Component
 * AI Math Tutor v2
 *
 * Displays the current quiz question with:
 * - Question text
 * - Topic and difficulty badges
 * - Question number
 */

import React from 'react';
import { QuizQuestion as Question, QuizDifficulty } from '@/types';

interface QuizQuestionProps {
  question: Question;
  questionNumber: number;
  totalQuestions: number;
}

const DIFFICULTY_STYLES: Record<QuizDifficulty, { bg: string; text: string; label: string }> = {
  easy: {
    bg: 'bg-green-100 dark:bg-green-900/30',
    text: 'text-green-700 dark:text-green-400',
    label: 'Easy',
  },
  medium: {
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    text: 'text-amber-700 dark:text-amber-400',
    label: 'Medium',
  },
  hard: {
    bg: 'bg-red-100 dark:bg-red-900/30',
    text: 'text-red-700 dark:text-red-400',
    label: 'Hard',
  },
};

export function QuizQuestion({
  question,
  questionNumber,
  totalQuestions,
}: QuizQuestionProps) {
  const difficultyStyle = DIFFICULTY_STYLES[question.difficulty];

  return (
    <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 md:p-8">
      {/* Header: Badges and question number */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {/* Topic badge */}
        <span className="px-3 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full">
          {question.topic}
        </span>

        {/* Difficulty badge */}
        <span
          className={`px-3 py-1 text-xs font-medium ${difficultyStyle.bg} ${difficultyStyle.text} rounded-full`}
        >
          {difficultyStyle.label}
        </span>

        {/* Level badge */}
        <span className="px-3 py-1 text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-full">
          {question.level}
        </span>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Question number */}
        <span className="text-sm font-medium text-slate-500 dark:text-slate-500">
          Q{questionNumber} of {totalQuestions}
        </span>
      </div>

      {/* Question text */}
      <div className="py-4">
        <h2 className="text-xl md:text-2xl font-semibold text-slate-900 dark:text-slate-100 leading-relaxed">
          {question.question}
        </h2>
      </div>

      {/* Subtopic indicator (subtle) */}
      {question.subtopic && (
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
          <span className="text-xs text-slate-500 dark:text-slate-500">
            Subtopic: {question.subtopic}
          </span>
        </div>
      )}
    </div>
  );
}
