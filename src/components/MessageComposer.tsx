'use client';

/**
 * Message Composer Component
 * AI Math Tutor v2
 *
 * Input area for composing messages with image upload support.
 * Includes mode controls (Show/Teach) as icon buttons with tooltips.
 * Supports a centered layout variant for the welcome state.
 */

import React, { useState, useRef, useEffect } from 'react';
import { validateImageFile, fileToBase64 } from '@/lib/chat';
import { ImagePreview } from './ImagePreview';
import { TutorMode } from '@/types';

interface MessageComposerProps {
  onSend: (message: string, image?: string) => void;
  disabled?: boolean;
  placeholder?: string;
  /** Whether to use centered welcome state layout */
  centered?: boolean;
  /** Current tutor mode */
  mode: TutorMode;
  /** Mode change handler */
  onModeChange: (mode: TutorMode) => void;
  /** Whether quiz mode is active */
  quizModeActive: boolean;
  /** Whether mode controls are disabled (e.g. during loading) */
  modeDisabled?: boolean;
}

export function MessageComposer({
  onSend,
  disabled = false,
  placeholder = 'Type your math question...',
  centered = false,
  mode,
  onModeChange,
  quizModeActive,
  modeDisabled = false,
}: MessageComposerProps) {
  const [message, setMessage] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [message]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();

    if ((!message.trim() && !image) || disabled) return;

    onSend(message.trim(), image || undefined);
    setMessage('');
    setImage(null);
    setImageError(null);

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    const validation = validateImageFile(file);
    if (!validation.valid) {
      setImageError(validation.error || 'Invalid file');
      return;
    }

    setIsUploading(true);
    setImageError(null);

    try {
      const base64 = await fileToBase64(file);
      setImage(base64);
    } catch {
      setImageError('Failed to process image. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const removeImage = () => {
    setImage(null);
    setImageError(null);
  };

  // Mode icon button helper
  const modeButtonClass = (isActive: boolean, isDisabled: boolean) =>
    `group/btn relative p-2 rounded-lg transition-colors ${
      isDisabled
        ? 'opacity-50 cursor-not-allowed text-slate-400 dark:text-slate-500'
        : isActive
        ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
        : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-300'
    }`;

  const showModeButton = (
    <button
      type="button"
      onClick={() => onModeChange('SHOW')}
      disabled={modeDisabled}
      className={modeButtonClass(mode === 'SHOW' && !quizModeActive, modeDisabled)}
      aria-pressed={mode === 'SHOW'}
      aria-label="Show mode"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
      <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 rounded-lg bg-slate-900 dark:bg-slate-700 text-white text-xs whitespace-nowrap opacity-0 group-hover/btn:opacity-100 transition-opacity z-50 shadow-lg">
        Show — Complete solutions
      </span>
    </button>
  );

  const teachModeButton = (
    <button
      type="button"
      onClick={() => onModeChange('TEACH')}
      disabled={modeDisabled}
      className={modeButtonClass(mode === 'TEACH' && !quizModeActive, modeDisabled)}
      aria-pressed={mode === 'TEACH'}
      aria-label="Teach mode"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
      </svg>
      <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 rounded-lg bg-slate-900 dark:bg-slate-700 text-white text-xs whitespace-nowrap opacity-0 group-hover/btn:opacity-100 transition-opacity z-50 shadow-lg">
        Teach — Guided hints
      </span>
    </button>
  );

  const rightSideModeButtons = (
    <div className="flex items-center gap-0.5">
      {showModeButton}
      {teachModeButton}
    </div>
  );

  // Hidden file input (shared)
  const fileInput = (
    <input
      ref={fileInputRef}
      type="file"
      accept="image/jpeg,image/png,image/gif,image/webp"
      onChange={handleImageUpload}
      className="hidden"
    />
  );

  // Image upload button (shared)
  const imageUploadButton = (
    <button
      type="button"
      onClick={() => fileInputRef.current?.click()}
      disabled={disabled || isUploading}
      className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      aria-label="Upload image"
      title="Upload a photo of your math problem"
    >
      {isUploading ? (
        <svg className="animate-spin h-[18px] w-[18px]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
      )}
    </button>
  );

  // Send button (shared)
  const sendButton = (
    <button
      type="submit"
      disabled={disabled || (!message.trim() && !image)}
      className="p-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      aria-label="Send message"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="22" y1="2" x2="11" y2="13" />
        <polygon points="22 2 15 22 11 13 2 9 22 2" />
      </svg>
    </button>
  );

  // ===== CENTERED LAYOUT (Welcome state) =====
  if (centered) {
    return (
      <div className="w-full max-w-2xl mx-auto px-4">
        {/* Image preview */}
        {image && (
          <div className="mb-3 relative inline-block">
            <ImagePreview src={image} alt="Upload preview" className="max-h-32" />
            <button
              onClick={removeImage}
              className="absolute -top-2 -right-2 w-6 h-6 bg-slate-500 hover:bg-slate-600 text-white rounded-full flex items-center justify-center transition-colors"
              aria-label="Remove image"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        )}

        {imageError && (
          <p className="mb-2 text-sm text-red-500">{imageError}</p>
        )}

        <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm overflow-hidden">
          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={message}
            onChange={e => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            rows={2}
            autoFocus
            className="w-full px-4 pt-4 pb-2 bg-transparent text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none resize-none max-h-36 text-base leading-relaxed"
          />

          {/* Toolbar row */}
          <div className="flex items-center justify-between px-3 pb-3">
            <div className="flex items-center gap-0.5">
              {imageUploadButton}
              <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-1" />
              {rightSideModeButtons}
            </div>
            {sendButton}
          </div>
        </form>

        {fileInput}

        <p className="mt-3 text-xs text-center text-slate-400 dark:text-slate-500">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    );
  }

  // ===== BOTTOM LAYOUT (Chat state) =====
  return (
    <div className="border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3">
      {/* Image preview */}
      {image && (
        <div className="mb-3 relative inline-block">
          <ImagePreview src={image} alt="Upload preview" className="max-h-32" />
          <button
            onClick={removeImage}
            className="absolute -top-2 -right-2 w-6 h-6 bg-slate-500 hover:bg-slate-600 text-white rounded-full flex items-center justify-center transition-colors"
            aria-label="Remove image"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}

      {imageError && (
        <p className="mb-2 text-sm text-red-500">{imageError}</p>
      )}

      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        {/* Image upload (left-most action) */}
        {imageUploadButton}

        {/* Mode controls (right of quiz toggle) */}
        {rightSideModeButtons}

        {/* Text input */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={e => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className="w-full px-4 py-2.5 h-10 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none max-h-36 transition-all disabled:opacity-50 disabled:cursor-not-allowed leading-[21px]"
          />
        </div>

        {/* Send button */}
        {sendButton}
      </form>

      {fileInput}
    </div>
  );
}
