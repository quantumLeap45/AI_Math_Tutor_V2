'use client';

/**
 * ChatMessagesArea Component
 * AI Math Tutor v2
 *
 * Handles two layouts:
 * 1. Welcome state (no messages) — centered input with suggestion chips
 * 2. Chat state (has messages) — message list with bottom composer
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
  onModeChange: (mode: TutorMode) => void;
  error: string | null;
  countdown: { formatted: string } | null;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  onSendMessage: (content: string, images?: string[], pdfInfo?: { name: string; pageCount: number }) => void;
  onReviewQuiz: (quiz: QuizSummaryData) => void;
  onRetryQuiz: (source?: string) => void;
  onDismissError: () => void;
}

export function ChatMessagesArea({
  currentSession,
  quizModeActive,
  isQuizActive,
  isLoading,
  isQuizLoading,
  mode,
  onModeChange,
  error,
  countdown,
  messagesEndRef,
  onSendMessage,
  onReviewQuiz,
  onRetryQuiz,
  onDismissError,
}: ChatMessagesAreaProps) {
  const hasMessages = currentSession && currentSession.messages.length > 0;

  const composerPlaceholder = quizModeActive
    ? 'Type your quiz request (e.g., "Give me 5 P2 fractions questions")...'
    : mode === 'TEACH'
      ? 'Type your question or share your attempt...'
      : 'Type your math question...';

  // Shared composer props
  const composerProps = {
    onSend: onSendMessage,
    disabled: isLoading || isQuizLoading,
    placeholder: composerPlaceholder,
    mode,
    onModeChange,
    quizModeActive,
    modeDisabled: isLoading || quizModeActive,
  };

  // Suggestion chip handler
  const handleSuggestion = (text: string) => {
    onSendMessage(text);
  };

  // ===== WELCOME STATE (centered) =====
  if (!hasMessages) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center overflow-hidden min-w-[300px] px-4">
        <div className="w-full max-w-2xl text-center mb-8">
          <div className="w-14 h-14 mx-auto mb-5 rounded-xl bg-emerald-500 flex items-center justify-center">
            <span className="text-white font-bold text-2xl">M</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
            What would you like to learn?
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            Ask any P1&ndash;P6 math question, start a quiz, or upload your homework.
          </p>
        </div>

        <MessageComposer {...composerProps} centered={true} />

        {/* Suggestion chips */}
        <div className="flex flex-wrap justify-center gap-2 mt-6 max-w-2xl px-4">
          {quizModeActive ? (
            <>
              <SuggestionChip onClick={handleSuggestion} text="Give me 5 P2 fractions questions" />
              <SuggestionChip onClick={handleSuggestion} text="10 P4 geometry questions" />
              <SuggestionChip onClick={handleSuggestion} text="15 P6 algebra problems" />
            </>
          ) : (
            <>
              <SuggestionChip onClick={handleSuggestion} text="What is 25 + 17?" />
              <SuggestionChip onClick={handleSuggestion} text="Help me with fractions" />
              <SuggestionChip onClick={handleSuggestion} text="How do I find the area of a rectangle?" />
            </>
          )}
        </div>
      </main>
    );
  }

  // ===== CHAT STATE (messages + bottom composer) =====
  return (
    <div className={`flex-1 flex flex-col min-w-[300px] transition-opacity duration-300 ${isQuizActive ? 'opacity-75' : 'opacity-100'}`}>
      {/* Scrollable messages area */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto p-4">
          <div className={quizModeActive ? "max-w-2xl mx-auto px-4" : "max-w-3xl mx-auto"}>
            {currentSession.messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                onReviewQuiz={onReviewQuiz}
                onRetryQuiz={onRetryQuiz}
              />
            ))}
            {isLoading && <MessageLoading />}

            <div ref={messagesEndRef} />
          </div>
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
                      {' '}&bull; Resets in{' '}
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
      </div>

      {/* Composer — outside overflow-hidden so tooltips aren't clipped */}
      <MessageComposer {...composerProps} centered={false} />
    </div>
  );
}

/** Small suggestion chip button */
function SuggestionChip({ text, onClick }: { text: string; onClick: (text: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onClick(text)}
      className="px-4 py-2 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-600 dark:text-slate-400 hover:border-emerald-300 dark:hover:border-emerald-700 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
    >
      {text}
    </button>
  );
}
