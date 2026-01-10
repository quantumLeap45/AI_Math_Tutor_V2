'use client';

/**
 * Message Bubble Component
 * AI Math Tutor v2
 *
 * Displays a single message with role-based styling.
 * Supports Markdown rendering for assistant messages.
 */

import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Message } from '@/types';
import { formatTimestamp } from '@/lib/chat';
import { ImagePreview } from './ImagePreview';

interface MessageBubbleProps {
  message: Message;
  showTimestamp?: boolean;
}

export function MessageBubble({ message, showTimestamp = false }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4 animate-fadeIn`}
    >
      <div
        className={`
          max-w-[85%] sm:max-w-[75%] px-4 py-3 rounded-2xl shadow-sm
          ${
            isUser
              ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-br-sm'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-bl-sm'
          }
        `}
      >
        {/* Image if present */}
        {message.imageUrl && (
          <div className="mb-3">
            <ImagePreview src={message.imageUrl} alt="Uploaded image" />
          </div>
        )}

        {/* Message content */}
        {isUser ? (
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-2 prose-headings:mt-3 prose-headings:mb-2 prose-li:my-1 prose-ul:my-2 prose-ol:my-2">
            <ReactMarkdown
              components={{
                // Customize rendering for better display
                p: ({ children }) => <p className="my-2">{children}</p>,
                strong: ({ children }) => (
                  <strong className="font-semibold text-blue-600 dark:text-blue-400">
                    {children}
                  </strong>
                ),
                ul: ({ children }) => (
                  <ul className="list-disc list-inside my-2 space-y-1">{children}</ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal list-inside my-2 space-y-1">{children}</ol>
                ),
                li: ({ children }) => <li className="my-1">{children}</li>,
                code: ({ children, className }) => {
                  // Check if it's an inline code or code block
                  const isCodeBlock = className?.includes('language-');
                  if (isCodeBlock) {
                    return (
                      <code className="block bg-slate-200 dark:bg-slate-700 p-3 rounded-lg my-2 overflow-x-auto text-sm">
                        {children}
                      </code>
                    );
                  }
                  return (
                    <code className="bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded text-sm">
                      {children}
                    </code>
                  );
                },
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        )}

        {/* Timestamp */}
        {showTimestamp && (
          <p
            className={`
              text-xs mt-2
              ${isUser ? 'text-white/70' : 'text-slate-400 dark:text-slate-500'}
            `}
          >
            {formatTimestamp(message.timestamp)}
          </p>
        )}
      </div>
    </div>
  );
}
