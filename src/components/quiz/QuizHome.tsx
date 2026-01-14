'use client';

/**
 * Quiz Home Component
 * AI Math Tutor v2
 *
 * Landing view for the quiz feature with Start New Quiz CTA,
 * category tiles, progress panel, recent scores, and scrollable resume panel.
 * Phase 3: Restructured layout with natural card heights.
 */

import React, { useEffect, useState } from 'react';
import { QuizAttempt } from '@/types';
import { getQuizAttempts, getQuizProgress } from '@/lib/storage';
import { ResumePanel } from './ResumePanel';

interface QuizHomeProps {
  onStartNew: () => void;
  inProgressQuizzes: QuizAttempt[];
  onResume: (quizId: string) => void;
  onDiscard: (quizId: string) => void;
}

export function QuizHome({ onStartNew, inProgressQuizzes, onResume, onDiscard }: QuizHomeProps) {
  // Load quiz progress from localStorage
  const [quizProgress, setQuizProgress] = useState(() => getQuizProgress());

  // Load recent scores from localStorage (FIX: was using mock data)
  const [recentScores, setRecentScores] = useState<{ score: number; topic: string; date: string; difficulty: string }[]>([]);

  useEffect(() => {
    // Load data on mount
    const loadQuizData = () => {
      const progress = getQuizProgress();
      setQuizProgress(progress);

      const attempts = getQuizAttempts();
      const scores = attempts
        .filter(a => a.state === 'completed')
        .map(a => ({
          score: a.score ?? 0,
          topic: a.config.topics[0] || 'Mixed Topics',
          date: a.completedAt ?? new Date().toISOString(),
          difficulty: a.config.difficulty ?? 'all',
        }))
        .slice(0, 5); // Show up to 5 recent scores
      setRecentScores(scores);
    };

    loadQuizData();

    // Listen for storage changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'math-tutor-quiz-attempts' || e.key === 'math-tutor-quiz-progress') {
        loadQuizData();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return (
    <div className="w-full max-w-7xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 mb-4 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-500 text-white">
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
          >
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <circle cx="12" cy="12" r="10" />
            <path d="M12 17h.01" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
          Math Quiz
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          Practice and test your math skills
        </p>
      </div>

      {/* ROW 1: Full-width CTA */}
      <div className="mb-6">
        <div className="bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl p-6 md:p-8 shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-white"
                >
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Generate New Quiz</h2>
                <p className="text-white/80">Create a custom quiz with your preferred topics</p>
              </div>
            </div>
            <button
              onClick={onStartNew}
              className="px-6 py-3 rounded-xl font-semibold text-white bg-white/20 hover:bg-white/30 transition-all flex items-center gap-2"
            >
              Start New Quiz
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* ROW 2: Two-column layout with items-start (4:8 ratio) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* Left column (4/12) - Start New Quiz (compact) + Recent Scores */}
        <div className="lg:col-span-4 space-y-6">

          {/* Compact Start New Quiz */}
          <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
              🎯 Generate New Quiz
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Create a custom quiz with your preferred topics
            </p>
            <button
              onClick={onStartNew}
              className="w-full py-3 px-4 rounded-xl font-semibold text-white bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
              Start Quiz
            </button>
          </div>

          {/* Recent Scores Panel */}
          <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
              📊 Recent Scores
            </h3>
            {recentScores.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-500 text-center py-4">
                No completed quizzes yet.
              </p>
            ) : (
              <div className="space-y-3">
                {recentScores.map((item, index) => {
                  const date = new Date(item.date);
                  const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                  const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                  return (
                    <div key={index} className="py-2 border-b border-slate-100 dark:border-slate-700 last:border-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          {item.topic}
                        </span>
                        <span className={`text-sm font-semibold ${getScoreColor(item.score)}`}>
                          {item.score}%
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-500">
                        <span>{item.difficulty}</span>
                        <span>•</span>
                        <span>{dateStr} at {timeStr}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right column (8/12) - Quiz Progress + Resume Quizzes (scrollable) */}
        <div className="lg:col-span-8 space-y-6">

          {/* Quiz Progress Panel */}
          <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
              🎯 Your Progress
            </h3>
            {quizProgress.totalQuizzes === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-500 text-center py-4">
                Complete your first quiz to see stats!
              </p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{quizProgress.totalQuizzes}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-500">Quizzes</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">{quizProgress.overallAccuracy}%</div>
                  <div className="text-xs text-slate-500 dark:text-slate-500">Accuracy</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{quizProgress.bestScore}%</div>
                  <div className="text-xs text-slate-500 dark:text-slate-500">Best</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{quizProgress.currentStreak}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-500">Streak</div>
                </div>
              </div>
            )}
          </div>

          {/* Resume Quizzes Panel - Scrollable with fixed height */}
          <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            {/* SCROLLABLE CONTAINER - Fixed height */}
            <div className="max-h-[400px] overflow-y-auto scrollbar-thin relative">
              {/* Top fade indicator */}
              <div className="sticky top-0 z-10 h-4 bg-gradient-to-b from-slate-50 to-transparent dark:from-slate-800 dark:to-transparent pointer-events-none" />

              {inProgressQuizzes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                  <div className="text-4xl mb-3">📝</div>
                  <p className="text-slate-600 dark:text-slate-400 font-medium">
                    No quizzes in progress
                  </p>
                  <p className="text-slate-500 dark:text-slate-500 text-sm mt-1">
                    Start a new quiz to see it here!
                  </p>
                </div>
              ) : (
                <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                  {inProgressQuizzes.map((quiz) => (
                    <ResumePanel
                      key={quiz.id}
                      quiz={quiz}
                      onResume={() => onResume(quiz.id)}
                      onDiscard={() => onDiscard(quiz.id)}
                    />
                  ))}
                </div>
              )}

              {/* Bottom fade indicator */}
              <div className="sticky bottom-0 z-10 h-4 bg-gradient-to-t from-slate-50 to-transparent dark:from-slate-800 dark:to-transparent pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Info Note */}
      <div className="mt-6 text-center text-sm text-slate-500 dark:text-slate-500">
        <p>Your progress is saved automatically</p>
      </div>
    </div>
  );
}

// Helper function for score color
function getScoreColor(score: number): string {
  if (score >= 90) return 'text-green-600 dark:text-green-400';
  if (score >= 70) return 'text-blue-600 dark:text-blue-400';
  if (score >= 50) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-600 dark:text-red-400';
}
