/**
 * Quiz Randomization Utilities
 * AI Math Tutor v2
 *
 * Handles randomization of questions and options to ensure
 * variety across quiz sessions.
 */

import { QuizQuestion, QuizOptions, QuizOption } from '@/types';

// ============ ARRAY SHUFFLING ============

/**
 * Fisher-Yates shuffle algorithm for true randomness
 * This is the gold standard for array shuffling
 */
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// ============ OPTION RANDOMIZATION ============

/**
 * Shuffle options in place for a question
 * Returns a new question with shuffled options and updated correctAnswer
 */
export function shuffleQuestionOptions(question: QuizQuestion): QuizQuestion {
  const optionEntries: [QuizOption, string][] = [
    ['A', question.options.A],
    ['B', question.options.B],
    ['C', question.options.C],
    ['D', question.options.D],
  ];

  // Shuffle the entries
  const shuffledEntries = shuffleArray(optionEntries);

  // Build new options object
  const shuffledOptions: QuizOptions = {
    A: shuffledEntries[0][1],
    B: shuffledEntries[1][1],
    C: shuffledEntries[2][1],
    D: shuffledEntries[3][1],
  };

  // Find which position now has the correct answer
  const correctValue = question.options[question.correctAnswer];
  const newCorrectKey = shuffledEntries.find(([, value]) => value === correctValue)![0];

  return {
    ...question,
    options: shuffledOptions,
    correctAnswer: newCorrectKey,
  };
}

/**
 * Shuffle options for multiple questions
 */
export function shuffleAllQuestionOptions(questions: QuizQuestion[]): QuizQuestion[] {
  return questions.map(shuffleQuestionOptions);
}
