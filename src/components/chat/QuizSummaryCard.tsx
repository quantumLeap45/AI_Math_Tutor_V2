'use client';

/**
 * Quiz Summary Card Component
 * AI Math Tutor v2
 *
 * Compact summary card displayed in chat after quiz completion.
 * Shows score, time taken, level/difficulty, and action buttons.
 * "Reveal Full Results" toggles an inline per-question breakdown.
 */

import React, { useState } from 'react';

export type Level = 'P1' | 'P2' | 'P3' | 'P4' | 'P5' | 'P6';
export type Difficulty = 'easy' | 'medium' | 'hard' | 'A1' | 'all';

interface QuizSummaryCardProps {
  score: number;
  totalQuestions: number;
  percentage: number;
  timeTaken: string;
  level: Level;
  difficulty: Difficulty;
  topic: string;
  retryAttempt?: number;
  /** Per-question data for the expanded breakdown */
  questions?: Array<{ question: string; topic: string; difficulty: string; correctAnswer: string }>;
  answers?: Array<{ selected: string | null; isCorrect: boolean }>;
  onRetry?: () => void;
}

export function QuizSummaryCard({
  score,
  totalQuestions,
  percentage,
  timeTaken,
  level,
  difficulty,
  topic,
  retryAttempt = 0,
  questions,
  answers,
  onRetry = () => {},
}: QuizSummaryCardProps) {
  const [expanded, setExpanded] = useState(false);
  const isRetry = retryAttempt > 0;

  // Compute topic breakdown from questions + answers if available
  const topicBreakdown = React.useMemo(() => {
    if (!questions || !answers) return null;
    const map = new Map<string, { correct: number; total: number }>();
    for (let i = 0; i < questions.length; i++) {
      const t = questions[i].topic;
      if (!map.has(t)) map.set(t, { correct: 0, total: 0 });
      const s = map.get(t)!;
      s.total += 1;
      if (answers[i]?.isCorrect) s.correct += 1;
    }
    return Array.from(map.entries())
      .map(([t, s]) => ({ topic: t, correct: s.correct, total: s.total, pct: Math.round((s.correct / s.total) * 100) }))
      .sort((a, b) => b.pct - a.pct);
  }, [questions, answers]);

  const difficultyLabel = difficulty === 'all' ? 'All Levels' : difficulty.charAt(0).toUpperCase() + difficulty.slice(1);

  return (
    <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white flex-shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            {isRetry ? `Retry #${retryAttempt} — ` : ''}Quiz Complete!
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">{level} · {difficultyLabel} · {topic}</p>
        </div>
      </div>

      {/* Score row */}
      <div className="flex items-center gap-6 mb-4">
        <div>
          <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">{score}/{totalQuestions}</span>
          <span className="ml-2 text-sm text-slate-500 dark:text-slate-400">correct</span>
        </div>
        <div>
          <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">{percentage}%</span>
          <span className="ml-2 text-sm text-slate-500 dark:text-slate-400">score</span>
        </div>
        <div className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          {timeTaken}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => setExpanded(prev => !prev)}
          className="flex-1 py-2 px-3 rounded-lg text-sm font-medium bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-1.5"
        >
          {expanded ? 'Hide Results' : 'Reveal Full Results'}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`transition-transform ${expanded ? 'rotate-180' : ''}`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
        <button
          onClick={onRetry}
          className="flex-1 py-2 px-3 rounded-lg text-sm font-medium bg-emerald-500 text-white hover:bg-emerald-600 transition-colors"
        >
          Retake Quiz
        </button>
      </div>

      {/* Expanded: Topic breakdown + per-question results */}
      {expanded && (
        <div className="mt-4 space-y-3">
          {/* Topic breakdown */}
          {topicBreakdown && topicBreakdown.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-2">By Topic</p>
              <div className="space-y-1.5">
                {topicBreakdown.map(({ topic: t, correct, total, pct }) => (
                  <div key={t} className="flex items-center gap-2">
                    <span className="text-xs text-slate-600 dark:text-slate-400 w-32 truncate">{t}</span>
                    <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-400' : 'bg-red-400'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300 w-12 text-right">{correct}/{total}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Per-question results */}
          {questions && answers && (
            <div>
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-2">Questions</p>
              <div className="space-y-1">
                {questions.map((q, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <span className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-white font-bold ${answers[i]?.isCorrect ? 'bg-emerald-500' : 'bg-red-400'}`}>
                      {answers[i]?.isCorrect ? '✓' : '✗'}
                    </span>
                    <span className="text-slate-700 dark:text-slate-300 flex-1 leading-relaxed">{q.question}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default QuizSummaryCard;
