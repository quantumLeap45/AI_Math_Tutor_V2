'use client';

/**
 * Mode Toggle Component
 * AI Math Tutor v2
 *
 * Toggle between SHOW and TEACH modes.
 */

import React from 'react';
import { TutorMode } from '@/types';

interface ModeToggleProps {
  mode: TutorMode;
  onChange: (mode: TutorMode) => void;
  disabled?: boolean;
}

export function ModeToggle({ mode, onChange, disabled = false }: ModeToggleProps) {
  const getButtonClass = (selectedMode: TutorMode, colorClass: string) => {
    const baseClass = 'px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200';
    if (disabled) return `${baseClass} opacity-50 cursor-not-allowed`;
    if (mode === selectedMode) return `${baseClass} bg-white dark:bg-slate-700 shadow-sm ${colorClass}`;
    return `${baseClass} text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200`;
  };

  return (
    <div className="inline-flex bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
      <button
        onClick={() => onChange('SHOW')}
        disabled={disabled}
        className={getButtonClass('SHOW', 'text-blue-600 dark:text-blue-400')}
        aria-pressed={mode === 'SHOW'}
        title="SHOW mode: I'll give you the complete solution with step-by-step explanations"
      >
        <span className="flex items-center gap-1.5">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          Show
        </span>
      </button>
      <button
        onClick={() => onChange('TEACH')}
        disabled={disabled}
        className={getButtonClass('TEACH', 'text-purple-600 dark:text-purple-400')}
        aria-pressed={mode === 'TEACH'}
        title="TEACH mode: I'll guide you to discover the answer yourself"
      >
        <span className="flex items-center gap-1.5">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
          </svg>
          Teach
        </span>
      </button>
    </div>
  );
}
