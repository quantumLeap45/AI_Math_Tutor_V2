'use client';

/**
 * Quiz Panel Component
 * AI Math Tutor v2
 *
 * Slide-in panel that displays quiz questions on the right side
 * of the chat interface during Quiz Mode.
 */

import React, { useState } from 'react';
import { QuizQuestion, QuizOption } from '@/types';

interface QuizPanelProps {
  /** Current question to display */
  currentQuestion: QuizQuestion;
  /** Question number (1-indexed) */
  questionNumber: number;
  /** Total number of questions */
  totalQuestions: number;
  /** Currently selected option */
  selectedOption: QuizOption | null;
  /** Whether feedback is shown */
  showFeedback: boolean;
  /** Whether this is the last question */
  isLastQuestion: boolean;
  /** Callback when user selects an option */
  onSelectOption: (option: QuizOption) => void;
  /** Callback when user clicks Check Answer / Next */
  onNext: () => void;
  /** Callback when user exits quiz */
  onExit: () => void;
  /** Whether panel is visible (for animation) */
  isVisible: boolean;
}

export function QuizPanel({
  currentQuestion,
  questionNumber,
  totalQuestions,
  selectedOption,
  showFeedback,
  isLastQuestion,
  onSelectOption,
  onNext,
  onExit,
  isVisible,
}: QuizPanelProps) {
  const isCorrect = selectedOption === currentQuestion.correctAnswer;

  return (
    <div
      className={`
        fixed right-0 top-16 bottom-0 w-[450px] bg-white dark:bg-slate-800
        border-l border-slate-200 dark:border-slate-700
        transform transition-transform duration-300 ease-in-out
        ${isVisible ? 'translate-x-0' : 'translate-x-full'}
        z-30 flex flex-col
      `}
      aria-label="Quiz panel"
    >
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
            Question {questionNumber} of {totalQuestions}
          </span>
          <button
            onClick={onExit}
            className="text-sm text-slate-500 hover:text-red-500 dark:text-slate-400 dark:hover:text-red-400 transition-colors"
          >
            Exit Quiz
          </button>
        </div>
        {/* Progress bar */}
        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
          <div
            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(questionNumber / totalQuestions) * 100}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <div className="flex-1 overflow-y-auto p-4">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
          {currentQuestion.question}
        </h3>

        {/* Options */}
        <div className="space-y-3">
          {(['A', 'B', 'C', 'D'] as QuizOption[]).map((option) => {
            const isSelected = selectedOption === option;
            const isCorrectOption = option === currentQuestion.correctAnswer;
            const shouldShowCorrect = showFeedback && isCorrectOption;
            const shouldShowIncorrect = showFeedback && isSelected && !isCorrect;

            return (
              <button
                key={option}
                onClick={() => !showFeedback && onSelectOption(option)}
                disabled={showFeedback}
                className={`
                  w-full p-4 text-left rounded-lg border-2 transition-all
                  ${showFeedback ? 'cursor-not-allowed' : 'cursor-pointer hover:border-blue-300'}
                  ${isSelected && !showFeedback
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-slate-200 dark:border-slate-700'
                  }
                  ${shouldShowCorrect
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                    : ''
                  }
                  ${shouldShowIncorrect
                    ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                    : ''
                  }
                `}
              >
                <div className="flex items-start gap-3">
                  <span className={`
                    flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-semibold
                    ${isSelected && !showFeedback
                      ? 'bg-blue-500 text-white'
                      : shouldShowCorrect
                      ? 'bg-green-500 text-white'
                      : shouldShowIncorrect
                      ? 'bg-red-500 text-white'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                    }
                  `}>
                    {option}
                  </span>
                  <span className="flex-1 text-slate-900 dark:text-slate-100">
                    {currentQuestion.options[option]}
                  </span>
                  {shouldShowCorrect && (
                    <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                  {shouldShowIncorrect && (
                    <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Feedback */}
        {showFeedback && (
          <div className={`
            mt-4 p-4 rounded-lg border
            ${isCorrect
              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
              : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
            }
          `}>
            <p className="font-semibold text-sm mb-1">
              {isCorrect ? 'Correct!' : 'Not quite!'}
            </p>
            {!isCorrect && (
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                The correct answer is <strong>{currentQuestion.correctAnswer}</strong>.
              </p>
            )}
            <p className="text-sm text-slate-700 dark:text-slate-300">
              {currentQuestion.explanation}
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 p-4 border-t border-slate-200 dark:border-slate-700">
        <button
          onClick={onNext}
          disabled={!selectedOption}
          className={`
            w-full py-3 rounded-lg font-semibold transition-all
            ${selectedOption
              ? 'bg-blue-500 text-white hover:bg-blue-600'
              : 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
            }
          `}
        >
          {!showFeedback
            ? 'Check Answer'
            : isLastQuestion
            ? 'Submit Quiz'
            : 'Next Question'
          }
        </button>
      </div>
    </div>
  );
}
