'use client';

/**
 * Quiz Setup Component
 * AI Math Tutor v2
 *
 * Configuration UI for setting up a new quiz session.
 * Allows selecting level, topics, difficulty, and question count.
 */

import React from 'react';
import {
  PrimaryLevel,
  QuizTopic,
  QuizDifficulty,
  QuizQuestionCount,
  P1_TOPICS,
  DIFFICULTY_OPTIONS,
  QUESTION_COUNT_OPTIONS,
} from '@/types';

interface QuizSetupProps {
  // Current configuration
  level: PrimaryLevel;
  topics: string[];
  difficulty: QuizDifficulty | 'all';
  questionCount: QuizQuestionCount;

  // Configuration setters
  setLevel: (level: PrimaryLevel) => void;
  setTopics: (topics: string[]) => void;
  setDifficulty: (difficulty: QuizDifficulty | 'all') => void;
  setQuestionCount: (count: QuizQuestionCount) => void;

  // Actions
  onStartQuiz: () => void;
  isLoading: boolean;

  // Navigation
  onBack?: () => void;

  // Available question counts (may be limited by available questions)
  availableQuestionCount?: number;
}

// Available topics as checkboxes
const TOPIC_OPTIONS: { value: QuizTopic; label: string; emoji: string }[] = [
  { value: 'Whole Numbers', label: 'Whole Numbers', emoji: '🔢' },
  { value: 'Addition/Subtraction', label: 'Addition & Subtraction', emoji: '➕' },
  { value: 'Multiplication/Division', label: 'Multiplication & Division', emoji: '✖️' },
  { value: 'Money', label: 'Money', emoji: '💰' },
  { value: 'Time', label: 'Time', emoji: '⏰' },
  { value: 'Patterns', label: 'Patterns', emoji: '🔷' },
];

const DIFFICULTY_LABELS: Record<QuizDifficulty | 'all', { label: string; emoji: string }> = {
  easy: { label: 'Easy', emoji: '🟢' },
  medium: { label: 'Medium', emoji: '🟡' },
  hard: { label: 'Hard', emoji: '🔴' },
  all: { label: 'All Levels', emoji: '🎯' },
};

const QUESTION_COUNT_LABELS: Record<QuizQuestionCount, string> = {
  5: '5 questions',
  10: '10 questions',
  15: '15 questions',
  20: '20 questions',
};

export function QuizSetup({
  level,
  topics,
  difficulty,
  questionCount,
  setLevel,
  setTopics,
  setDifficulty,
  setQuestionCount,
  onStartQuiz,
  isLoading,
  onBack,
  availableQuestionCount,
}: QuizSetupProps) {
  const toggleTopic = (topic: QuizTopic) => {
    const isSelected = topics.includes(topic);
    const canDeselect = topics.length > 1;

    if (isSelected && canDeselect) {
      setTopics(topics.filter(t => t !== topic));
    } else if (!isSelected) {
      setTopics([...topics, topic]);
    }
  };

  const toggleAllTopics = () => {
    const allSelected = topics.length === P1_TOPICS.length;
    setTopics(allSelected ? [P1_TOPICS[0]] : [...P1_TOPICS]);
  };

  const allSelected = topics.length === P1_TOPICS.length;

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Back button */}
      {onBack && (
        <button
          onClick={onBack}
          className="mb-6 flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
          <span className="font-medium">Back to Quiz Home</span>
        </button>
      )}

      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 mb-4 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-500 text-white">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <circle cx="12" cy="12" r="10" />
            <path d="M12 17h.01" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
          Math Quiz
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          Test your knowledge with practice questions
        </p>
      </div>

      {/* Configuration Card */}
      <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 space-y-8">
        {/* Level Selection */}
        <div>
          <label className="block text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">
            Primary Level
          </label>
          <div className="flex flex-wrap gap-2">
            {(['P1'] as PrimaryLevel[]).map((lvl) => (
              <button
                key={lvl}
                onClick={() => setLevel(lvl)}
                disabled
                className={`
                  px-4 py-2 rounded-lg font-medium transition-all
                  ${
                    level === lvl
                      ? 'bg-blue-500 text-white shadow-md'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                  }
                  cursor-not-allowed opacity-75
                `}
              >
                {lvl}
                {lvl === level && (
                  <span className="ml-2 text-xs bg-white/20 px-2 py-0.5 rounded-full">
                    Current
                  </span>
                )}
              </button>
            ))}
            <span className="text-sm text-slate-500 dark:text-slate-500 py-2 px-3">
              More levels coming soon!
            </span>
          </div>
        </div>

        {/* Topic Selection */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-semibold text-slate-900 dark:text-slate-100">
              Topics
            </label>
            <button
              onClick={toggleAllTopics}
              className="text-sm text-blue-500 dark:text-blue-400 hover:underline"
            >
              {allSelected ? 'Clear All' : 'Select All'}
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {TOPIC_OPTIONS.map((topic) => (
              <button
                key={topic.value}
                onClick={() => toggleTopic(topic.value)}
                className={`
                  p-4 rounded-xl border-2 transition-all text-left
                  ${
                    topics.includes(topic.value)
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600'
                  }
                `}
              >
                <div className="text-2xl mb-1">{topic.emoji}</div>
                <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  {topic.label}
                </div>
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-500">
            {topics.length === P1_TOPICS.length
              ? 'All topics selected'
              : `${topics.length} of ${P1_TOPICS.length} topics selected`}
          </p>
        </div>

        {/* Difficulty Selection */}
        <div>
          <label className="block text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">
            Difficulty
          </label>
          <div className="flex flex-wrap gap-2">
            {DIFFICULTY_OPTIONS.map((diff) => (
              <button
                key={diff}
                onClick={() => setDifficulty(diff)}
                className={`
                  px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2
                  ${
                    difficulty === diff
                      ? 'bg-blue-500 text-white shadow-md'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
                  }
                `}
              >
                <span>{DIFFICULTY_LABELS[diff].emoji}</span>
                {DIFFICULTY_LABELS[diff].label}
              </button>
            ))}
          </div>
        </div>

        {/* Question Count */}
        <div>
          <label className="block text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">
            Number of Questions
          </label>
          <div className="flex flex-wrap gap-2">
            {QUESTION_COUNT_OPTIONS.map((count) => {
              const isAvailable = !availableQuestionCount || count <= availableQuestionCount;
              const isSelected = questionCount === count;

              const getButtonClass = () => {
                if (isSelected) return 'bg-blue-500 text-white shadow-md';
                if (isAvailable) return 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600';
                return 'bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed line-through';
              };

              return (
                <button
                  key={count}
                  onClick={() => isAvailable && setQuestionCount(count)}
                  disabled={!isAvailable}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${getButtonClass()}`}
                >
                  {QUESTION_COUNT_LABELS[count]}
                  {!isAvailable && <span className="ml-1 text-xs">(N/A)</span>}
                </button>
              );
            })}
          </div>
          {availableQuestionCount && availableQuestionCount < 20 && (
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-500">
              Only {availableQuestionCount} questions available with current filters
            </p>
          )}
        </div>

        {/* Start Button */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={onStartQuiz}
            disabled={isLoading || topics.length === 0}
            className={`
              w-full py-4 px-6 rounded-xl font-semibold text-lg
              flex items-center justify-center gap-2
              transition-all duration-200
              ${
                isLoading || topics.length === 0
                  ? 'bg-slate-300 dark:bg-slate-700 text-slate-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]'
              }
            `}
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Loading...
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                Start Quiz
              </>
            )}
          </button>
        </div>
      </div>

      {/* Info Note */}
      <div className="mt-6 text-center text-sm text-slate-500 dark:text-slate-500">
        <p>Your progress will be saved automatically</p>
      </div>
    </div>
  );
}
