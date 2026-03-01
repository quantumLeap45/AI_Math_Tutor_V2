'use client';

/**
 * Message Composer Component
 * AI Math Tutor v2
 *
 * Input area for composing messages with multi-image and PDF upload support.
 * - Regular images: up to 3 per message (shown as thumbnails)
 * - PDF: 1 per message, all pages (up to 20) sent to AI, shown as a clickable chip
 * - Drag and drop: drop images or PDFs anywhere on the composer
 * - Clipboard paste: Cmd+V / Ctrl+V with image in clipboard
 * - Mode controls: Show/Teach icon buttons with tooltips
 * - Two layout variants: centered (welcome state) and bottom (chat state)
 */

import React, { useState, useRef, useEffect, useCallback, DragEvent, ClipboardEvent } from 'react';
import { validateImageFile, fileToBase64 } from '@/lib/chat';
import { ImagePreview } from './ImagePreview';
import { TutorMode } from '@/types';

const MAX_IMAGES = 3;
const MAX_PDF_PAGES = 20;

interface PdfAttachment {
  name: string;
  pageImages: string[];   // base64 JPEG strings — sent to AI
  objectUrl: string;      // blob URL — for opening in browser tab
}

interface PdfInfo {
  name: string;
  pageCount: number;
}

interface MessageComposerProps {
  onSend: (message: string, images?: string[], pdfInfo?: PdfInfo) => void;
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
  const [attachments, setAttachments] = useState<string[]>([]);       // regular images
  const [pdfAttachment, setPdfAttachment] = useState<PdfAttachment | null>(null);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [message]);

  // Revoke blob URL when pdf attachment is cleared to free memory
  const clearPdf = useCallback(() => {
    setPdfAttachment(prev => {
      if (prev?.objectUrl) URL.revokeObjectURL(prev.objectUrl);
      return null;
    });
  }, []);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();

    if ((!message.trim() && attachments.length === 0 && !pdfAttachment) || disabled) return;

    const allImages = [...attachments, ...(pdfAttachment?.pageImages ?? [])];
    const pdfInfo: PdfInfo | undefined = pdfAttachment
      ? { name: pdfAttachment.name, pageCount: pdfAttachment.pageImages.length }
      : undefined;

    onSend(message.trim(), allImages.length > 0 ? allImages : undefined, pdfInfo);
    setMessage('');
    setAttachments([]);
    clearPdf();
    setAttachmentError(null);

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

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
    setAttachmentError(null);
  };

  // ---- Core file processor (shared by file input, drag-drop, and paste) ----
  const processFile = useCallback(async (file: File) => {
    setAttachmentError(null);

    if (file.type === 'application/pdf') {
      if (pdfAttachment) {
        setAttachmentError('Only one PDF allowed at a time. Remove the current one first.');
        return;
      }
      if (file.size > 20 * 1024 * 1024) {
        setAttachmentError('PDF must be under 20MB.');
        return;
      }

      setIsProcessing(true);
      try {
        const pdfjsLib = await import('pdfjs-dist');
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const pagesToRender = Math.min(pdf.numPages, MAX_PDF_PAGES);
        const newImages: string[] = [];

        for (let i = 1; i <= pagesToRender; i++) {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 1.5 });
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) continue;
          await page.render({ canvasContext: ctx, viewport }).promise;
          newImages.push(canvas.toDataURL('image/jpeg', 0.85));
        }

        const objectUrl = URL.createObjectURL(file);
        setPdfAttachment({ name: file.name, pageImages: newImages, objectUrl });

        if (pdf.numPages > MAX_PDF_PAGES) {
          setAttachmentError(
            `PDF has ${pdf.numPages} pages — only the first ${MAX_PDF_PAGES} were loaded.`
          );
        }
      } catch {
        setAttachmentError('Failed to process PDF. Please try again.');
      } finally {
        setIsProcessing(false);
      }
    } else {
      // Image file
      if (attachments.length >= MAX_IMAGES) {
        setAttachmentError(`Maximum ${MAX_IMAGES} images allowed.`);
        return;
      }

      const validation = validateImageFile(file);
      if (!validation.valid) {
        setAttachmentError(validation.error || 'Invalid file.');
        return;
      }

      setIsProcessing(true);
      try {
        const base64 = await fileToBase64(file);
        setAttachments(prev => [...prev, base64]);
      } catch {
        setAttachmentError('Failed to process image. Please try again.');
      } finally {
        setIsProcessing(false);
      }
    }
  }, [attachments.length, pdfAttachment]);

  // ---- File input (click to upload) ----
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (fileInputRef.current) fileInputRef.current.value = '';
    await processFile(file);
  };

  // ---- Drag and drop ----
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    // Only clear if leaving the whole drop zone (not entering a child)
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    // Process files one at a time — first valid file wins for PDFs
    for (const file of files) {
      if (
        file.type === 'application/pdf' ||
        file.type.startsWith('image/')
      ) {
        await processFile(file);
      }
    }
  };

  // ---- Clipboard paste ----
  const handlePaste = async (e: ClipboardEvent<HTMLTextAreaElement>) => {
    const items = Array.from(e.clipboardData.items);
    const imageItem = items.find(item => item.type.startsWith('image/'));
    if (!imageItem) return;  // let normal text paste proceed

    e.preventDefault();
    const file = imageItem.getAsFile();
    if (file) await processFile(file);
  };

  // ---- Mode buttons ----
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
      <span className="pointer-events-none absolute bottom-full left-0 mb-2 px-2.5 py-1.5 rounded-lg bg-slate-900 dark:bg-slate-700 text-white text-xs whitespace-nowrap opacity-0 group-hover/btn:opacity-100 transition-opacity z-50 shadow-lg">
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

  // Hidden file input
  const fileInput = (
    <input
      ref={fileInputRef}
      type="file"
      accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
      onChange={handleImageUpload}
      className="hidden"
    />
  );

  // Upload button
  const imageUploadButton = (
    <button
      type="button"
      onClick={() => fileInputRef.current?.click()}
      disabled={disabled || isProcessing || (attachments.length >= MAX_IMAGES && !pdfAttachment)}
      className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      aria-label="Upload image or PDF"
      title={
        attachments.length >= MAX_IMAGES
          ? 'Maximum 3 images — upload a PDF instead'
          : 'Upload a photo or PDF (or drag & drop / paste)'
      }
    >
      {isProcessing ? (
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

  // Send button
  const sendButton = (
    <button
      type="submit"
      disabled={disabled || (!message.trim() && attachments.length === 0 && !pdfAttachment)}
      className="p-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      aria-label="Send message"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="22" y1="2" x2="11" y2="13" />
        <polygon points="22 2 15 22 11 13 2 9 22 2" />
      </svg>
    </button>
  );

  // Image thumbnails row
  const imagePreviews = attachments.length > 0 && (
    <div className="mb-2 flex flex-wrap gap-2">
      {attachments.map((src, i) => (
        <div key={i} className="relative inline-block">
          <ImagePreview src={src} alt={`Attachment ${i + 1}`} className="w-16 h-16 object-cover rounded-lg" />
          <button
            type="button"
            onClick={() => removeAttachment(i)}
            className="absolute -top-2 -right-2 w-5 h-5 bg-slate-500 hover:bg-slate-600 text-white rounded-full flex items-center justify-center transition-colors"
            aria-label={`Remove image ${i + 1}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );

  // PDF chip
  const pdfChip = pdfAttachment && (
    <div className="mb-2 flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg max-w-sm">
      {/* PDF icon */}
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 text-red-500">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>

      {/* Filename + page count — clicking opens PDF in new tab */}
      <button
        type="button"
        onClick={() => window.open(pdfAttachment.objectUrl, '_blank')}
        className="flex-1 text-left min-w-0"
        title="Click to view PDF"
      >
        <span className="block text-sm font-medium text-slate-700 dark:text-slate-300 truncate">
          {pdfAttachment.name}
        </span>
        <span className="block text-xs text-slate-500 dark:text-slate-400">
          {pdfAttachment.pageImages.length} page{pdfAttachment.pageImages.length !== 1 ? 's' : ''} · click to view
        </span>
      </button>

      {/* Remove button */}
      <button
        type="button"
        onClick={clearPdf}
        className="flex-shrink-0 w-5 h-5 rounded-full bg-slate-300 dark:bg-slate-600 hover:bg-slate-400 dark:hover:bg-slate-500 flex items-center justify-center transition-colors"
        aria-label="Remove PDF"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );

  // Drag-over overlay (shared)
  const dragOverlay = isDragOver && (
    <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-emerald-50/90 dark:bg-emerald-950/90 border-2 border-dashed border-emerald-400 dark:border-emerald-600 pointer-events-none">
      <div className="flex flex-col items-center gap-2 text-emerald-600 dark:text-emerald-400">
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="16 16 12 12 8 16" />
          <line x1="12" y1="12" x2="12" y2="21" />
          <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
        </svg>
        <span className="text-sm font-medium">Drop to attach</span>
      </div>
    </div>
  );

  // Attachments area (shared between both layouts)
  const attachmentsArea = (attachments.length > 0 || pdfAttachment) && (
    <div className="mb-2">
      {imagePreviews}
      {pdfChip}
    </div>
  );

  // ===== CENTERED LAYOUT (Welcome state) =====
  if (centered) {
    return (
      <div
        className="w-full max-w-2xl mx-auto px-4 relative"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {dragOverlay}

        {attachmentsArea}

        {attachmentError && (
          <p className="mb-2 text-sm text-red-500">{attachmentError}</p>
        )}

        <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm overflow-hidden">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={e => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={placeholder}
            disabled={disabled}
            rows={2}
            autoFocus
            className="w-full px-4 pt-4 pb-2 bg-transparent text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none resize-none max-h-36 text-base leading-relaxed"
          />
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
          Enter to send · Shift+Enter for new line · Paste or drag &amp; drop images
        </p>
      </div>
    );
  }

  // ===== BOTTOM LAYOUT (Chat state) =====
  return (
    <div
      className="border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 relative"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {dragOverlay}

      {attachmentsArea}

      {attachmentError && (
        <p className="mb-2 text-sm text-red-500">{attachmentError}</p>
      )}

      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        {imageUploadButton}
        {rightSideModeButtons}

        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={e => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className="w-full px-4 py-2.5 h-10 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none max-h-36 transition-all disabled:opacity-50 disabled:cursor-not-allowed leading-[21px]"
          />
        </div>

        {sendButton}
      </form>

      {fileInput}
    </div>
  );
}
