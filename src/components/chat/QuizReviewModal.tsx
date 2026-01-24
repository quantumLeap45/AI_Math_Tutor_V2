'use client';

/**
 * Quiz Review Modal Component
 * AI Math Tutor v2
 *
 * Modal displayed after quiz completion showing detailed review
 * of all questions, user answers, and correct answers.
 */

import React from 'react';
import { ChatQuizState } from '@/types';

interface QuizReviewModalProps {
  /** Quiz state to review */
  quiz: ChatQuizState;
  /** Whether modal is open */
  isOpen: boolean;
  /** Callback when modal is closed */
  onClose: () => void;
  /** Callback when user wants to retry quiz */
  onRetry: () => void;
}

export function QuizReviewModal({
  quiz,
  isOpen,
  onClose,
  onRetry,
}: QuizReviewModalProps) {
  if (!isOpen) {
    return null;
  }

  // Calculate score
  const correctCount = quiz.answers.filter((answer) => answer.isCorrect).length;
  const score = `${correctCount}/${quiz.questions.length}`;
  const percentage = Math.round((correctCount / quiz.questions.length) * 100);

  // Calculate time taken
  const startTime = new Date(quiz.startedAt).getTime();
  const endTime = new Date().getTime();
  const timeTakenSeconds = Math.floor((endTime - startTime) / 1000);
  const minutes = Math.floor(timeTakenSeconds / 60);
  const seconds = timeTakenSeconds % 60;
  const timeTaken = minutes > 0
    ? `${minutes}m ${seconds}s`
    : `${seconds}s`;

  // Build topics string for title
  const topicsStr = quiz.config.topics.slice(0, 2).join(', ');
  const quizTitle = `Review: ${quiz.config.level} ${quiz.config.topics[0] || 'Quiz'}`;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="quiz-review-title"
    >
      <div
        className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Header */}
        <div className="flex-shrink-0 p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <h2 id="quiz-review-title" className="text-xl font-semibold text-slate-900 dark:text-slate-100">
              {quizTitle}
            </h2>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              aria-label="Close review"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Questions List */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            {quiz.questions.map((question, index) => {
              const answer = quiz.answers[index];
              const isCorrect = answer.isCorrect;
              const userAnswer = answer.selected;
              const correctAnswer = question.correctAnswer;

              return (
                <div
                  key={question.id}
                  className={`
                    p-4 rounded-lg border-2
                    ${isCorrect
                      ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20'
                      : 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20'
                    }
                  `}
                >
                  {/* Question Header */}
                  <div className="flex items-start gap-3 mb-3">
                    <span className={`
                      flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-sm font-semibold
                      ${isCorrect ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}
                    `}>
                      {isCorrect ? (
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      )}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Question {index + 1}
                      </p>
                      <p className="text-slate-900 dark:text-slate-100 font-medium">
                        {question.question}
                      </p>
                    </div>
                  </div>

                  {/* Answer Details */}
                  <div className="ml-9 space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-slate-600 dark:text-slate-400">Your answer:</span>
                      {userAnswer ? (
                        <span className={`
                          font-semibold
                          ${isCorrect ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}
                        `}>
                          {userAnswer}. {question.options[userAnswer]}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Not answered</span>
                      )}
                    </div>

                    {!isCorrect && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-slate-600 dark:text-slate-400">Correct answer:</span>
                        <span className="font-semibold text-green-600 dark:text-green-400">
                          {correctAnswer}. {question.options[correctAnswer]}
                        </span>
                      </div>
                    )}

                    {/* Explanation */}
                    <div className="mt-3 p-3 bg-white/50 dark:bg-slate-900/50 rounded border border-slate-200 dark:border-slate-700">
                      <p className="text-sm text-slate-700 dark:text-slate-300">
                        {question.explanation}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 p-6 border-t border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-6">
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Score</p>
                <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  {score} <span className="text-sm font-normal">({percentage}%)</span>
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Time</p>
                <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  {timeTaken}
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={onRetry}
            className="w-full py-3 px-4 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold transition-colors"
          >
            Retry Quiz
          </button>
        </div>
      </div>
    </div>
  );
}
