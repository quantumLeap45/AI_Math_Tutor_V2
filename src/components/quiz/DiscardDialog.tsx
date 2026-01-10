'use client';

/**
 * Discard Dialog Component
 * AI Math Tutor v2
 *
 * Confirmation modal for discarding quiz progress.
 * Accessible with focus trap and keyboard support.
 */

import React, { useEffect, useRef } from 'react';

interface DiscardDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  progress: string; // e.g., "3 of 10"
}

export function DiscardDialog({ isOpen, onClose, onConfirm, progress }: DiscardDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Focus trap and initial focus
  useEffect(() => {
    if (isOpen && cancelButtonRef.current) {
      cancelButtonRef.current.focus();
    }
  }, [isOpen]);

  // Prevent body scroll when dialog is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="discard-dialog-title"
      aria-describedby="discard-dialog-description"
    >
      <div
        ref={dialogRef}
        className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 pb-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-red-600 dark:text-red-400"
              >
                <path d="M3 6h18" />
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                <line x1="10" y1="11" x2="10" y2="17" />
                <line x1="14" y1="11" x2="14" y2="17" />
              </svg>
            </div>
            <div>
              <h2
                id="discard-dialog-title"
                className="text-xl font-bold text-slate-900 dark:text-slate-100"
              >
                Discard Quiz Progress?
              </h2>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 pb-6">
          <p
            id="discard-dialog-description"
            className="text-slate-600 dark:text-slate-400 mb-4"
          >
            Are you sure you want to discard your progress? You&apos;ve completed{' '}
            <span className="font-semibold text-slate-900 dark:text-slate-100">{progress}</span>{' '}
            questions.
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-500">
            This action cannot be undone.
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-6 pt-0">
          <button
            ref={cancelButtonRef}
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-xl font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 px-4 rounded-xl font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors"
          >
            Discard
          </button>
        </div>
      </div>
    </div>
  );
}
