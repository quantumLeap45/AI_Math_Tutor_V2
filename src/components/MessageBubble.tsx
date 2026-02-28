'use client';

/**
 * Message Bubble Component
 * AI Math Tutor v2
 *
 * Displays a single message with role-based styling.
 * Supports Markdown rendering for assistant messages.
 * Includes M logo avatar for AI messages and credits display.
 * Also renders quiz summary cards for quiz_summary messages.
 */

import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Message, QuizSummaryData } from '@/types';
import { formatTimestamp } from '@/lib/chat';
import { formatLatexToKidFriendly } from '@/lib/math-format';
import { ImagePreview } from './ImagePreview';
import { QuizSummaryCard } from './chat/QuizSummaryCard';

interface MessageBubbleProps {
  message: Message;
  onReviewQuiz?: (quiz: QuizSummaryData) => void;
  onRetryQuiz?: (source?: string) => void;
}

export function MessageBubble({ message, onReviewQuiz, onRetryQuiz }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const isQuizSummary = message.quizSummary !== undefined; // Check for quizSummary data instead of role

  // Render quiz summary as a full-width card
  if (isQuizSummary && message.quizSummary) {
    return (
      <div className="w-full max-w-3xl mx-auto mb-4 animate-fadeIn">
        <QuizSummaryCard
          score={message.quizSummary.score}
          totalQuestions={message.quizSummary.totalQuestions}
          percentage={message.quizSummary.percentage}
          timeTaken={message.quizSummary.timeTaken}
          level={message.quizSummary.config.level}
          difficulty={message.quizSummary.config.difficulty}
          topic={message.quizSummary.questions?.[0]?.topic || message.quizSummary.config.topics[0] || 'Math'}
          retryAttempt={message.quizSummary.retryAttempt}
          questions={message.quizSummary.questions?.map(q => ({
            question: q.question,
            topic: q.topic,
            difficulty: q.difficulty,
            correctAnswer: q.correctAnswer,
          }))}
          answers={message.quizSummary.answers?.map(a => ({
            selected: a.selected,
            isCorrect: a.isCorrect,
          }))}
          onRetry={() => onRetryQuiz?.(message.quizSummary?.source)}
        />
      </div>
    );
  }

  return (
    <div
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4 animate-fadeIn`}
    >
      {/* AI Avatar */}
      {!isUser && (
        <div className="flex-shrink-0 mr-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center">
            <span className="text-white font-bold text-sm">M</span>
          </div>
        </div>
      )}

      <div className="flex flex-col max-w-[85%] sm:max-w-[75%]">
        <div
          className={`
            px-4 py-3 rounded-xl shadow-sm
            ${isUser
              ? 'bg-emerald-500 text-white'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
            }
          `}
        >
          {/* Multi-image (new messages) */}
          {message.imageUrls && message.imageUrls.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {message.imageUrls.map((url, i) => (
                <div key={i}>
                  <ImagePreview src={url} alt={`Image ${i + 1}`} />
                </div>
              ))}
            </div>
          )}
          {/* Legacy single image (old stored messages — backward compat) */}
          {!message.imageUrls && message.imageUrl && (
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
                    <strong className="font-semibold text-emerald-600 dark:text-emerald-400">
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
                {formatLatexToKidFriendly(message.content)}
              </ReactMarkdown>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
