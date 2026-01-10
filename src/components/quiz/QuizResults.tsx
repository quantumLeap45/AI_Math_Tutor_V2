'use client';

/**
 * Quiz Results Component
 * AI Math Tutor v2
 *
 * Displays final quiz results including:
 * - Score and performance rating
 * - Topic breakdown
 * - Time taken
 * - Answer review
 * - Actions (restart, return home)
 */

import React, { useState } from 'react';
import { QuizResult, QuizQuestion, QuizAnswer, PerformanceRating, formatDuration } from '@/types';

interface QuizResultsProps {
  result: QuizResult;
  questions: QuizQuestion[];
  answers: QuizAnswer[];
  onRestart: () => void;
  onReturnHome: () => void;
}

interface RatingConfig {
  emoji: string;
  title: string;
  description: string;
  bg: string;
  text: string;
}

const RATING_CONFIG: Record<PerformanceRating, RatingConfig> = {
  excellent: {
    emoji: '🏆',
    title: 'Excellent!',
    description: "Outstanding work! You've mastered this topic.",
    bg: 'bg-green-100 dark:bg-green-900/30',
    text: 'text-green-700 dark:text-green-400',
  },
  good: {
    emoji: '👍',
    title: 'Good Job!',
    description: 'Well done! Keep practicing to improve further.',
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    text: 'text-blue-700 dark:text-blue-400',
  },
  fair: {
    emoji: '💪',
    title: 'Good Effort!',
    description: "You're on the right track. More practice will help!",
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    text: 'text-amber-700 dark:text-amber-400',
  },
  needs_practice: {
    emoji: '📚',
    title: 'Keep Practicing!',
    description: "Don't give up! Review the material and try again.",
    bg: 'bg-purple-100 dark:bg-purple-900/30',
    text: 'text-purple-700 dark:text-purple-400',
  },
};

export function QuizResults({
  result,
  questions,
  answers,
  onRestart,
  onReturnHome,
}: QuizResultsProps) {
  const [showReview, setShowReview] = useState(false);
  const ratingConfig = RATING_CONFIG[result.rating];

  // Create answer review items
  const reviews = questions.map((question, index) => ({
    question,
    answer: answers[index],
    questionNumber: index + 1,
  }));

  // Helper to get accuracy color class
  const getAccuracyColor = (accuracy: number): string => {
    if (accuracy >= 80) return 'bg-green-500';
    if (accuracy >= 60) return 'bg-amber-500';
    return 'bg-red-500';
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* Results Card */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        {/* Header with rating */}
        <div className={`p-8 text-center ${ratingConfig.bg}`}>
          <div className="text-6xl mb-4">{ratingConfig.emoji}</div>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            {ratingConfig.title}
          </h2>
          <p className={`text-lg ${ratingConfig.text}`}>
            {ratingConfig.description}
          </p>
        </div>

        {/* Score Display */}
        <div className="p-8">
          <div className="flex items-center justify-center gap-8 mb-8">
            {/* Score circle */}
            <div className="text-center">
              <div className="relative w-32 h-32 mx-auto">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    fill="none"
                    className="stroke-slate-100 dark:stroke-slate-700"
                    strokeWidth="12"
                  />
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    fill="none"
                    className="stroke-current"
                    strokeWidth="12"
                    strokeDasharray={`${(result.score / 100) * 352} 352`}
                    strokeLinecap="round"
                    style={{
                      color: result.score >= 70 ? '#22c55e' : result.score >= 50 ? '#f59e0b' : '#ef4444',
                    }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-4xl font-bold text-slate-900 dark:text-slate-100">
                    {result.score}%
                  </span>
                </div>
              </div>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Score</p>
            </div>

            {/* Stats */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-600 dark:text-green-400">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                    {result.correctCount}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-500">Correct</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-600 dark:text-red-400">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="15" y1="9" x2="9" y2="15" />
                    <line x1="9" y1="9" x2="15" y2="15" />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                    {result.totalQuestions - result.correctCount}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-500">Incorrect</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600 dark:text-blue-400">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                    {formatDuration(result.totalTime)}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-500">Time</p>
                </div>
              </div>
            </div>
          </div>

          {/* Topic Breakdown */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
              Performance by Topic
            </h3>
            <div className="space-y-3">
              {result.topicBreakdown.map((topic) => (
                <div
                  key={topic.topic}
                  className="bg-slate-50 dark:bg-slate-900 rounded-lg p-3"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      {topic.topic}
                    </span>
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                      {topic.correct}/{topic.attempted} ({topic.accuracy}%)
                    </span>
                  </div>
                  <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${getAccuracyColor(topic.accuracy)} rounded-full transition-all duration-500`}
                      style={{ width: `${topic.accuracy}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Answer Review Toggle */}
          <button
            onClick={() => setShowReview(!showReview)}
            className="w-full py-3 px-4 rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-2 text-slate-700 dark:text-slate-300"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {showReview ? (
                <polyline points="18 15 12 9 6 15" />
              ) : (
                <polyline points="6 9 12 15 18 9" />
              )}
            </svg>
            {showReview ? 'Hide' : 'Show'} Answer Review
          </button>

          {/* Answer Review Details */}
          {showReview && (
            <div className="mt-4 space-y-4 max-h-96 overflow-y-auto">
              {reviews.map(({ question, answer, questionNumber }) => (
                <div
                  key={question.id}
                  className={`p-4 rounded-lg border-2 ${
                    answer.isCorrect
                      ? 'border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-900/10'
                      : 'border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/10'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                        answer.isCorrect
                          ? 'bg-green-500 text-white'
                          : 'bg-red-500 text-white'
                      }`}
                    >
                      {answer.isCorrect ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-500 dark:text-slate-500 mb-1">
                        Question {questionNumber}
                      </p>
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">
                        {question.question}
                      </p>

                      <div className="text-sm space-y-1">
                        <p className={answer.isCorrect ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                          Your answer: {answer.selected ?? 'Skipped'}
                          {!answer.isCorrect && (
                            <span className="ml-2">
                              (Correct: {question.correctAnswer})
                            </span>
                          )}
                        </p>
                        <p className="text-slate-600 dark:text-slate-400 text-xs">
                          {question.explanation}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-6 flex flex-col sm:flex-row gap-3">
        <button
          onClick={onRestart}
          className="flex-1 py-3 px-6 rounded-xl font-semibold bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
          Try Again
        </button>
        <button
          onClick={onReturnHome}
          className="flex-1 py-3 px-6 rounded-xl font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          Back to Home
        </button>
      </div>
    </div>
  );
}

export default QuizResults;
