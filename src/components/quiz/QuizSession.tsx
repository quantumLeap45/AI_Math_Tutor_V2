'use client';

/**
 * Quiz Session Component
 * AI Math Tutor v2
 *
 * Main quiz component that orchestrates the entire quiz flow:
 * - Setup phase: Configure quiz options
 * - Active phase: Answer questions
 * - Results phase: View results
 * - Loading/Error states
 */

import React from 'react';
import { useQuiz } from '@/hooks';
import {
  QuizSetup,
  QuizProgressCompact,
  QuizQuestion,
  QuizOptions,
  QuizResults,
  QuizHome,
  QuizAIChat,
} from '@/components/quiz';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { QuizOption } from '@/types';

export function QuizSession() {
  const {
    phase,
    config,
    currentQuiz,
    inProgressQuizzes,
    isLoading,
    error,
    result,
    elapsed,
    feedbackShown,
    setLevel,
    setTopics,
    setDifficulty,
    setQuestionCount,
    startQuiz,
    resumeQuiz,
    discardQuiz,
    goToSetup,
    selectOption,
    nextQuestion,
    previousQuestion,
    restartQuiz,
    returnToSetup,
    saveAndExit,
    clearError,
  } = useQuiz();

  // Error state
  if (phase === 'error') {
    return (
      <div className="w-full max-w-md mx-auto text-center">
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-red-200 dark:border-red-900 p-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-red-600 dark:text-red-400"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            Oops! Something went wrong
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6">{error}</p>
          <button
            onClick={clearError}
            className="px-6 py-2 rounded-lg bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Loading state
  if (phase === 'loading') {
    return (
      <div className="w-full max-w-md mx-auto text-center py-12">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-slate-600 dark:text-slate-400">
          Preparing your quiz...
        </p>
      </div>
    );
  }

  // Home phase - Quiz landing with Start New and Resume Panels
  if (phase === 'home') {
    return (
      <QuizHome
        onStartNew={goToSetup}
        inProgressQuizzes={inProgressQuizzes}
        onResume={resumeQuiz}
        onDiscard={discardQuiz}
      />
    );
  }

  // Setup phase
  if (phase === 'setup') {
    return (
      <QuizSetup
        level={config.level}
        topics={config.topics}
        difficulty={config.difficulty ?? 'all'}
        questionCount={config.questionCount}
        setLevel={setLevel}
        setTopics={setTopics}
        setDifficulty={setDifficulty}
        setQuestionCount={setQuestionCount}
        onStartQuiz={startQuiz}
        isLoading={isLoading}
        onBack={() => returnToSetup()}
      />
    );
  }

  // Results phase
  if (phase === 'results' && result && currentQuiz) {
    return (
      <QuizResults
        result={result}
        questions={currentQuiz.questions}
        answers={currentQuiz.answers}
        onRestart={restartQuiz}
        onReturnHome={returnToSetup}
      />
    );
  }

  // Active phase
  if (phase === 'active' && currentQuiz) {
    const currentQuestion = currentQuiz.questions[currentQuiz.currentIndex];
    const currentAnswer = currentQuiz.answers[currentQuiz.currentIndex];
    const isLastQuestion = currentQuiz.currentIndex === currentQuiz.questions.length - 1;
    const hasSelected = currentAnswer.selected !== null;

    return (
      <>
        <div className="w-full max-w-2xl mx-auto">
          {/* Progress bar */}
          <QuizProgressCompact
            currentIndex={currentQuiz.currentIndex}
            totalQuestions={currentQuiz.questions.length}
            elapsed={elapsed}
          />

          {/* Question */}
          <QuizQuestion
            question={currentQuestion}
            questionNumber={currentQuiz.currentIndex + 1}
            totalQuestions={currentQuiz.questions.length}
          />

          {/* Options */}
          <div className="mt-6">
            <QuizOptions
              options={currentQuestion.options}
              selectedOption={currentAnswer.selected}
              correctAnswer={currentQuestion.correctAnswer}
              onSelect={(option) => selectOption(option as QuizOption)}
              showResult={feedbackShown}
              explanation={currentQuestion.explanation}
            />
          </div>

          {/* Action buttons */}
          <div className="mt-6 flex items-center justify-between">
            {/* Previous button */}
            <button
              onClick={previousQuestion}
              disabled={currentQuiz.currentIndex === 0}
              className={`
                px-4 py-2 rounded-lg font-medium transition-colors
                flex items-center gap-2
                ${
                  currentQuiz.currentIndex === 0
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }
              `}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              Previous
            </button>

            {/* Next/Submit button */}
            <button
              onClick={nextQuestion}
              disabled={!hasSelected}
              className={`
                px-6 py-2 rounded-lg font-semibold transition-all flex items-center gap-2
                ${
                  hasSelected
                    ? 'bg-blue-500 text-white hover:bg-blue-600 shadow-md hover:shadow-lg'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
                }
              `}
            >
              {!feedbackShown ? (
                <>
                  Check Answer
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </>
              ) : isLastQuestion ? (
                <>
                  See Results
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </>
              ) : (
                <>
                  Next Question
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </>
              )}
            </button>
          </div>

          {/* Save & Exit button */}
          <div className="mt-8 text-center">
            <button
              onClick={saveAndExit}
              className="text-sm text-slate-600 dark:text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors flex items-center gap-2 mx-auto"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                <polyline points="17 21 17 13 7 13 7 21" />
                <polyline points="7 3 7 8 15 8" />
              </svg>
              Save & Exit
            </button>
          </div>

          {/* Skip hint (if no selection) */}
          {!hasSelected && (
            <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900 rounded-lg">
              <p className="text-sm text-amber-700 dark:text-amber-400 text-center">
                Select an answer to continue, or go back if you want to review previous questions.
              </p>
            </div>
          )}
        </div>

        {/* AI Chat Assistant */}
        <QuizAIChat
          currentQuestion={currentQuestion}
          questionNumber={currentQuiz.currentIndex + 1}
        />
      </>
    );
  }

  // Fallback
  return null;
}
