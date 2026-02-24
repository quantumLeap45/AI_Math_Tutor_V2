'use client';

/**
 * Quiz Drawer Component
 * AI Math Tutor v2
 *
 * Right-side slide-in panel containing the full quiz flow:
 * setup → active → results — without leaving the chat page.
 */

import React from 'react';
import { QuizSession } from './QuizSession';

interface QuizDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function QuizDrawer({ isOpen, onClose }: QuizDrawerProps) {
  return (
    <>
      {/* Backdrop */}
      <div
        className={`
          fixed inset-0 z-40 bg-black/30 backdrop-blur-[1px]
          transition-opacity duration-300
          ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}
        `}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Math Quiz"
        className={`
          fixed top-0 right-0 z-50 h-full w-full sm:w-[460px]
          bg-slate-50 dark:bg-slate-950
          shadow-2xl border-l border-slate-200 dark:border-slate-800
          flex flex-col
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        {/* Drawer header */}
        <div className="flex-none flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <circle cx="12" cy="12" r="10" />
                <path d="M12 17h.01" />
              </svg>
            </div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Math Quiz
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Close quiz panel"
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
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Scrollable quiz content */}
        <div className="flex-1 overflow-y-auto p-4">
          {isOpen && <QuizSession startDirect />}
        </div>
      </div>
    </>
  );
}
