'use client';

/**
 * Loading Spinner Component
 * AI Math Tutor v2
 *
 * Various loading indicators for different contexts.
 */

import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LoadingSpinner({ size = 'md', className = '' }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-10 h-10 border-3',
  };

  return (
    <div
      className={`
        ${sizeClasses[size]}
        border-blue-500 border-t-transparent
        rounded-full
        animate-spin
        ${className}
      `}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}

/**
 * Animated loading dots for chat responses
 */
export function LoadingDots() {
  return (
    <div className="flex items-center gap-1" role="status" aria-label="AI is thinking">
      <span className="sr-only">AI is thinking...</span>
      {[0, 1, 2].map(i => (
        <span
          key={i}
          className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
}

/**
 * Full page loading screen
 */
export function LoadingScreen() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-white dark:bg-slate-900">
      <div className="text-center">
        <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
          <span className="text-white font-bold text-lg">M</span>
        </div>
        <LoadingSpinner size="lg" className="mx-auto mb-4" />
        <p className="text-slate-600 dark:text-slate-400">Loading...</p>
      </div>
    </div>
  );
}

/**
 * Skeleton loading placeholder
 */
interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-slate-200 dark:bg-slate-700 rounded ${className}`}
    />
  );
}

/**
 * Message loading bubble (typing indicator)
 */
export function MessageLoading() {
  return (
    <div className="flex justify-start mb-4">
      <div className="px-4 py-3 rounded-2xl rounded-bl-sm bg-slate-100 dark:bg-slate-800">
        <LoadingDots />
      </div>
    </div>
  );
}

export default LoadingSpinner;
