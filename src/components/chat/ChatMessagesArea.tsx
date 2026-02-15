'use client';

/**
 * ChatMessagesArea Component
 * AI Math Tutor v2
 *
 * Message display area: empty state, message list, error banner,
 * and message composer.
 */

import React from 'react';
import { MessageBubble } from '@/components/MessageBubble';
import { MessageComposer } from '@/components/MessageComposer';
import { MessageLoading } from '@/components/LoadingSpinner';
import { ChatSession, QuizSummaryData, TutorMode } from '@/types';

interface ChatMessagesAreaProps {
  currentSession: ChatSession | null;
  quizModeActive: boolean;
  isQuizActive: boolean;
  isLoading: boolean;
  isQuizLoading: boolean;
  mode: TutorMode;
  error: string | null;
  countdown: { formatted: string } | null;
  quotaStatus: { remaining: number; limit: number };
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  onSendMessage: (content: string, image?: string) => void;
  onReviewQuiz: (quiz: QuizSummaryData) => void;
  onRetryQuiz: () => void;
  onDismissError: () => void;
}

export function ChatMessagesArea({
  currentSession,
  quizModeActive,
  isQuizActive,
  isLoading,
  isQuizLoading,
  mode,
  error,
  countdown,
  quotaStatus,
  messagesEndRef,
  onSendMessage,
  onReviewQuiz,
  onRetryQuiz,
  onDismissError,
}: ChatMessagesAreaProps) {
  return (
    <main className={`flex-1 flex flex-col overflow-hidden min-w-[300px] transition-opacity duration-300 ${isQuizActive ? 'opacity-75' : 'opacity-100'}`}>
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        {!currentSession || currentSession.messages.length === 0 ? (
          // Empty state
          <div className="h-full flex items-center justify-center">
            <div className="text-center max-w-md p-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-emerald-500 flex items-center justify-center">
                {quizModeActive ? (
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : (
                  <span className="text-white text-2xl">M</span>
                )}
              </div>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
                {quizModeActive ? 'Quiz Mode Active!' : 'Ready to learn math!'}
              </h2>
              <p className="text-slate-600 dark:text-slate-400 mb-4">
                {quizModeActive
                  ? 'Type your quiz request below. Tell me the topic, level, and how many questions you want.'
                  : 'Ask me any Primary 1-6 math question. You can type or upload a photo of your homework.'
                }
              </p>
              {quizModeActive ? (
                <div className="space-y-2 text-sm text-slate-500 dark:text-slate-400">
                  <p>Try typing:</p>
                  <ul className="space-y-1">
                    <li>&quot;Give me 5 P2 fractions questions&quot;</li>
                    <li>&quot;Generate 10 P4 geometry questions&quot;</li>
                    <li>&quot;I want 15 P6 algebra problems&quot;</li>
                  </ul>
                </div>
              ) : (
                <div className="space-y-2 text-sm text-slate-500 dark:text-slate-400">
                  <p>Try asking:</p>
                  <ul className="space-y-1">
                    <li>&quot;What is 25 + 17?&quot;</li>
                    <li>&quot;Help me with fractions&quot;</li>
                    <li>&quot;How do I find the area of a rectangle?&quot;</li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        ) : (
          // Messages list
          <div className={quizModeActive ? "max-w-2xl mx-auto px-4" : "max-w-3xl mx-auto"}>
            {currentSession.messages.map((message, index) => (
              <MessageBubble
                key={message.id}
                message={message}
                quotaInfo={message.role === 'assistant' && index === currentSession.messages.length - 1 ? {
                  remaining: quotaStatus.remaining,
                  limit: quotaStatus.limit
                } : undefined}
                onReviewQuiz={onReviewQuiz}
                onRetryQuiz={onRetryQuiz}
              />
            ))}
            {isLoading && <MessageLoading />}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div
          className={`px-4 py-2 border-t ${error.includes('Daily limit')
            ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
            : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
            }`}
        >
          <p
            className={`text-sm text-center ${error.includes('Daily limit')
              ? 'text-amber-700 dark:text-amber-300'
              : 'text-red-600 dark:text-red-400'
              }`}
          >
            {error.includes('Daily limit') ? (
              <>
                <span className="font-medium">Daily limit reached</span>
                {countdown && (
                  <span>
                    {' '}• Resets in{' '}
                    <span className="font-mono font-bold">{countdown.formatted}</span>
                  </span>
                )}
                <button
                  onClick={onDismissError}
                  className="ml-2 underline hover:no-underline"
                >
                  Dismiss
                </button>
              </>
            ) : (
              <>
                {error}
                <button
                  onClick={onDismissError}
                  className="ml-2 underline hover:no-underline"
                >
                  Dismiss
                </button>
              </>
            )}
          </p>
        </div>
      )}

      {/* Composer */}
      <MessageComposer
        onSend={onSendMessage}
        disabled={isLoading || isQuizLoading}
        placeholder={
          quizModeActive
            ? 'Type your quiz request (e.g., "Give me 5 P2 fractions questions")...'
            : mode === 'TEACH'
              ? 'Type your question or share your attempt...'
              : 'Type your math question...'
        }
      />
    </main>
  );
}
