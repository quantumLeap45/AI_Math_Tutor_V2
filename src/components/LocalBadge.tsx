'use client';

/**
 * LocalBadge Component
 * AI Math Tutor v2
 *
 * Displays a "Local" badge with lock icon and tooltip
 * explaining that data is stored locally in the browser.
 */

import React, { useState, useRef, useEffect } from 'react';

export function LocalBadge() {
  const [showTooltip, setShowTooltip] = useState(false);
  const badgeRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Close tooltip on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowTooltip(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close tooltip when clicking outside
  useEffect(() => {
    if (!showTooltip) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        badgeRef.current && !badgeRef.current.contains(e.target as Node) &&
        tooltipRef.current && !tooltipRef.current.contains(e.target as Node)
      ) {
        setShowTooltip(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showTooltip]);

  return (
    <span className="relative inline-flex items-center" ref={badgeRef}>
      {/* Badge */}
      <button
        type="button"
        onClick={() => setShowTooltip(!showTooltip)}
        className="inline-flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-medium px-2 py-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
        aria-expanded={showTooltip}
        aria-describedby="local-storage-tooltip"
      >
        {/* Lock icon */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="flex-shrink-0"
        >
          <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>

        <span>Local</span>

        {/* Info icon */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="flex-shrink-0 opacity-60"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4" />
          <path d="M12 8h.01" />
        </svg>
      </button>

      {/* Tooltip */}
      {showTooltip && (
        <div
          id="local-storage-tooltip"
          ref={tooltipRef}
          className="absolute z-50 w-64 p-3 mt-2 text-xs text-slate-700 dark:text-slate-300 bg-slate-900 dark:bg-slate-100 rounded-lg shadow-lg animate-in fade-in slide-in-from-top-1 duration-200"
          role="tooltip"
        >
          <p className="font-medium mb-2">Your data is stored locally in this browser only.</p>
          <ul className="space-y-1 text-slate-300 dark:text-slate-600">
            <li className="flex items-start gap-2">
              <span className="text-slate-400 dark:text-slate-500">•</span>
              <span>No account required</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-slate-400 dark:text-slate-500">•</span>
              <span>No cross-device sync</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-slate-400 dark:text-slate-500">•</span>
              <span>Clear browser data = lose progress</span>
            </li>
          </ul>
        </div>
      )}
    </span>
  );
}
