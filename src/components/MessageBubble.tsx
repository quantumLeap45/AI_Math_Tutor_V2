'use client';

/**
 * Message Bubble Component
 * AI Math Tutor v2
 *
 * Displays a single message with role-based styling.
 * Supports Markdown rendering for assistant messages.
 * Includes M logo avatar for AI messages and credits display.
 */

import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Message } from '@/types';
import { formatTimestamp } from '@/lib/chat';
import { ImagePreview } from './ImagePreview';

interface MessageBubbleProps {
  message: Message;
  showTimestamp?: boolean;
  quotaInfo?: { remaining: number; limit: number };
}

export function MessageBubble({ message, showTimestamp = false, quotaInfo }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4 animate-fadeIn`}
    >
      {/* AI Avatar */}
      {!isUser && (
        <div className="flex-shrink-0 mr-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
            <span className="text-white font-bold text-sm">M</span>
          </div>
        </div>
      )}

      <div className="flex flex-col max-w-[85%] sm:max-w-[75%]">
        <div
          className={`
            px-4 py-3 rounded-2xl shadow-sm
            ${
              isUser
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-br-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-bl-sm rounded-tr-sm'
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

        {/* Credits display - only for AI messages at bottom right */}
        {!isUser && quotaInfo && (
          <div
            className="self-end mt-1 px-2 py-0.5 rounded-md bg-slate-50 dark:bg-slate-800/50 group relative"
            title="50 messages per day • Resets at midnight"
          >
            <span className="text-xs text-slate-400 dark:text-slate-500 tabular-nums">
              {quotaInfo.remaining}/{quotaInfo.limit} left
            </span>
            {/* Tooltip */}
            <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block w-48 p-2 bg-slate-900 dark:bg-slate-700 text-white text-xs rounded-lg shadow-lg z-10">
              <div className="font-medium mb-1">Daily Usage Limit</div>
              <div className="text-slate-300">
                {quotaInfo.limit} messages per day • Resets at midnight UTC
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
