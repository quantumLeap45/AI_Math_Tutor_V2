'use client';

/**
 * Quiz Options Component
 * AI Math Tutor v2
 *
 * Displays multiple choice answer options.
 * Handles selection state and provides feedback for answered questions.
 */

import React from 'react';
import { QuizOptions as Options, QuizOption } from '@/types';

interface QuizOptionsProps {
  options: Options;
  selectedOption: QuizOption | null;
  correctAnswer: QuizOption;
  onSelect: (option: QuizOption) => void;
  disabled?: boolean;
  showResult?: boolean; // Show correct/incorrect after answering
}

const OPTION_LABELS: Record<QuizOption, string> = {
  A: 'A',
  B: 'B',
  C: 'C',
  D: 'D',
};

const OPTION_STYLES = [
  {
    hover: 'hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20',
    selected: 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-slate-800',
    correct: 'border-green-500 bg-green-50 dark:bg-green-900/20',
    incorrect: 'border-red-500 bg-red-50 dark:bg-red-900/20',
  },
  {
    hover: 'hover:border-purple-300 dark:hover:border-purple-700 hover:bg-purple-50 dark:hover:bg-purple-900/20',
    selected: 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 ring-2 ring-purple-500 ring-offset-2 dark:ring-offset-slate-800',
    correct: 'border-green-500 bg-green-50 dark:bg-green-900/20',
    incorrect: 'border-red-500 bg-red-50 dark:bg-red-900/20',
  },
  {
    hover: 'hover:border-amber-300 dark:hover:border-amber-700 hover:bg-amber-50 dark:hover:bg-amber-900/20',
    selected: 'border-amber-500 bg-amber-50 dark:bg-amber-900/20 ring-2 ring-amber-500 ring-offset-2 dark:ring-offset-slate-800',
    correct: 'border-green-500 bg-green-50 dark:bg-green-900/20',
    incorrect: 'border-red-500 bg-red-50 dark:bg-red-900/20',
  },
  {
    hover: 'hover:border-emerald-300 dark:hover:border-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20',
    selected: 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 ring-2 ring-emerald-500 ring-offset-2 dark:ring-offset-slate-800',
    correct: 'border-green-500 bg-green-50 dark:bg-green-900/20',
    incorrect: 'border-red-500 bg-red-50 dark:bg-red-900/20',
  },
];

export function QuizOptions({
  options,
  selectedOption,
  correctAnswer,
  onSelect,
  disabled = false,
  showResult = false,
}: QuizOptionsProps) {
  const optionEntries: [QuizOption, string][] = [
    ['A', options.A],
    ['B', options.B],
    ['C', options.C],
    ['D', options.D],
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {optionEntries.map(([key, text], index) => {
        const isSelected = selectedOption === key;
        const isCorrect = key === correctAnswer;
        const styles = OPTION_STYLES[index];

        const getButtonClass = () => {
          const baseClass = 'relative p-4 rounded-xl border-2 transition-all duration-200 text-left bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border-slate-200 dark:border-slate-700';

          if (showResult) {
            if (isCorrect) return `${baseClass} ${styles.correct}`;
            if (isSelected && !isCorrect) return `${baseClass} ${styles.incorrect}`;
            return `${baseClass} opacity-60`;
          }

          if (isSelected) return `${baseClass} ${styles.selected}`;
          if (!disabled) return `${baseClass} ${styles.hover} cursor-pointer`;
          return `${baseClass} opacity-50 cursor-not-allowed`;
        };

        const getBadgeClass = () => {
          if (showResult) {
            if (isCorrect) return 'bg-green-500 text-white';
            if (isSelected && !isCorrect) return 'bg-red-500 text-white';
          }
          if (isSelected) return 'bg-blue-500 text-white';
          return 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400';
        };

        const getStatusIcon = () => {
          if (!showResult) return null;
          if (isCorrect) {
            return (
              <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
            );
          }
          if (isSelected && !isCorrect) {
            return (
              <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </div>
            );
          }
          return null;
        };

        return (
          <button
            key={key}
            onClick={() => !disabled && !showResult && onSelect(key)}
            disabled={disabled || showResult}
            className={getButtonClass()}
          >
            <div className="flex items-start gap-3">
              <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${getBadgeClass()}`}>
                {OPTION_LABELS[key]}
              </div>
              <div className="flex-1 pt-1">
                <span className="text-base font-medium text-slate-900 dark:text-slate-100">{text}</span>
              </div>
              {showResult && <div className="flex-shrink-0">{getStatusIcon()}</div>}
            </div>
          </button>
        );
      })}
    </div>
  );
}

// Compact version for smaller displays
interface QuizOptionsCompactProps {
  options: Options;
  selectedOption: QuizOption | null;
  onSelect: (option: QuizOption) => void;
  disabled?: boolean;
}

export function QuizOptionsCompact({
  options,
  selectedOption,
  onSelect,
  disabled = false,
}: QuizOptionsCompactProps) {
  const optionEntries: [QuizOption, string][] = [
    ['A', options.A],
    ['B', options.B],
    ['C', options.C],
    ['D', options.D],
  ];

  return (
    <div className="space-y-3">
      {optionEntries.map(([key, text]) => {
        const isSelected = selectedOption === key;
        const getBadgeClass = () => {
          if (isSelected) return 'bg-blue-500 text-white';
          return 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400';
        };
        const getButtonClass = () => {
          if (isSelected) return 'border-blue-500 bg-blue-50 dark:bg-blue-900/20';
          return 'border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md hover:border-slate-300 dark:hover:border-slate-600';
        };

        return (
          <button
            key={key}
            onClick={() => !disabled && onSelect(key)}
            disabled={disabled}
            className={`w-full p-4 rounded-lg border transition-all text-left ${getButtonClass()} ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
          >
            <div className="flex items-center gap-3">
              <span className={`w-6 h-6 rounded flex items-center justify-center text-sm font-bold ${getBadgeClass()}`}>
                {key}
              </span>
              <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{text}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
