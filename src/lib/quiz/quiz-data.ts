/**
 * Quiz Data Access Layer
 * AI Math Tutor v2
 *
 * Handles loading and accessing quiz question data.
 * All quiz data is stored in /data/quiz-p1.json and /data/quiz-p2.json
 */

import {
  QuizQuestion,
  QuizConfig,
  PrimaryLevel,
  QuizDifficulty,
  QuizOption,
  P1_TOPICS,
  P2_TOPICS,
} from '@/types';
import { shuffleArray } from './quiz-randomization';

// ============ DATA IMPORT ============

/**
 * P1 Quiz Questions (imported from JSON file)
 * This is dynamically imported to avoid SSR issues
 */
let P1_QUESTIONS_CACHE: QuizQuestion[] | null = null;

/**
 * Load and parse P1 quiz questions from JSON
 */
async function loadP1Questions(): Promise<QuizQuestion[]> {
  if (P1_QUESTIONS_CACHE) {
    return P1_QUESTIONS_CACHE;
  }

  try {
    // Dynamic import to avoid SSR issues
    const data = await import('@/data/quiz-p1.json');
    const rawQuestions = data.default || data;

    // Validate and parse questions
    const questions: QuizQuestion[] = rawQuestions.map((q) => ({
      id: q.id,
      level: q.level as PrimaryLevel,
      topic: q.topic,
      subtopic: q.subtopic,
      difficulty: q.difficulty as QuizDifficulty,
      question: q.question,
      options: q.options,
      correctAnswer: q.correctAnswer as QuizOption,
      explanation: q.explanation,
    }));

    P1_QUESTIONS_CACHE = questions;
    return questions;
  } catch (error) {
    console.error('Failed to load quiz questions:', error);
    return [];
  }
}

/**
 * P2 Quiz Questions (imported from JSON file)
 * This is dynamically imported to avoid SSR issues
 */
let P2_QUESTIONS_CACHE: QuizQuestion[] | null = null;

/**
 * Load and parse P2 quiz questions from JSON
 */
async function loadP2Questions(): Promise<QuizQuestion[]> {
  if (P2_QUESTIONS_CACHE) {
    return P2_QUESTIONS_CACHE;
  }

  try {
    // Dynamic import to avoid SSR issues
    const data = await import('@/data/quiz-p2.json');
    const rawQuestions = data.default || data;

    // Validate and parse questions
    const questions: QuizQuestion[] = rawQuestions.map((q) => ({
      id: q.id,
      level: q.level as PrimaryLevel,
      topic: q.topic,
      subtopic: q.subtopic,
      difficulty: q.difficulty as QuizDifficulty,
      question: q.question,
      options: q.options,
      correctAnswer: q.correctAnswer as QuizOption,
      explanation: q.explanation,
    }));

    P2_QUESTIONS_CACHE = questions;
    return questions;
  } catch (error) {
    console.error('Failed to load P2 quiz questions:', error);
    return [];
  }
}

/**
 * Reset the cache (useful for testing or data updates)
 */
export function resetQuestionCache(): void {
  P1_QUESTIONS_CACHE = null;
  P2_QUESTIONS_CACHE = null;
}

// ============ PUBLIC API ============

/**
 * Get all available topics for a given level
 */
export function getAvailableTopics(level: string): string[] {
  if (level === 'P1') {
    return [...P1_TOPICS];
  }
  if (level === 'P2') {
    return [...P2_TOPICS];
  }
  // Future levels can be added here
  return [];
}

/**
 * Get all questions for a specific level
 */
export async function getQuestionsForLevel(level: string): Promise<QuizQuestion[]> {
  if (level === 'P1') {
    return loadP1Questions();
  }
  if (level === 'P2') {
    return loadP2Questions();
  }
  // Future levels can be added here
  return [];
}

/**
 * Get questions matching the given configuration
 * Filters by topic and difficulty as specified
 */
export async function getQuestionsForConfig(config: QuizConfig): Promise<QuizQuestion[]> {
  const allQuestions = await getQuestionsForLevel(config.level);

  // Filter by topics (if specified)
  let filtered = allQuestions;

  if (config.topics.length > 0) {
    filtered = filtered.filter(q => config.topics.includes(q.topic));
  }

  // Filter by difficulty (if specified)
  if (config.difficulty && config.difficulty !== 'all') {
    filtered = filtered.filter(q => q.difficulty === config.difficulty);
  }

  return filtered;
}

/**
 * Get a random subset of questions matching the configuration
 */
export async function getRandomQuestions(
  config: QuizConfig,
  count: number
): Promise<QuizQuestion[]> {
  const available = await getQuestionsForConfig(config);

  // If we don't have enough questions, return what we have
  const actualCount = Math.min(count, available.length);

  // Shuffle and slice
  const shuffled = shuffleArray(available);
  return shuffled.slice(0, actualCount);
}

/**
 * Get all unique topics from available questions
 */
export async function getAvailableTopicsForLevel(level: string): Promise<string[]> {
  const questions = await getQuestionsForLevel(level);
  const uniqueTopics = new Set(questions.map(q => q.topic));
  return Array.from(uniqueTopics).sort();
}

/**
 * Get all unique subtopics for a given topic
 */
export async function getSubtopicsForTopic(level: string, topic: string): Promise<string[]> {
  const questions = await getQuestionsForLevel(level);
  const uniqueSubtopics = new Set(
    questions.filter(q => q.topic === topic).map(q => q.subtopic)
  );
  return Array.from(uniqueSubtopics).sort();
}

/**
 * Get question count for a topic
 */
export async function getQuestionCountForTopic(level: string, topic: string): Promise<number> {
  const questions = await getQuestionsForLevel(level);
  return questions.filter(q => q.topic === topic).length;
}

/**
 * Get question count for difficulty
 */
export async function getQuestionCountForDifficulty(
  level: string,
  difficulty: QuizDifficulty
): Promise<number> {
  const questions = await getQuestionsForLevel(level);
  return questions.filter(q => q.difficulty === difficulty).length;
}

/**
 * Check if enough questions are available for the config
 */
export async function hasEnoughQuestions(config: QuizConfig): Promise<boolean> {
  const available = await getQuestionsForConfig(config);
  return available.length >= config.questionCount;
}

/**
 * Get the maximum number of questions available for a config
 */
export async function getMaxQuestionsForConfig(config: QuizConfig): Promise<number> {
  const available = await getQuestionsForConfig(config);
  return available.length;
}

/**
 * Find a question by its ID
 */
export async function findQuestionById(level: string, id: string): Promise<QuizQuestion | undefined> {
  const questions = await getQuestionsForLevel(level);
  return questions.find(q => q.id === id);
}

/**
 * Get summary statistics for available questions
 */
export async function getQuestionSummary(level: string): Promise<{
  total: number;
  byTopic: Record<string, number>;
  byDifficulty: Record<string, number>;
}> {
  const questions = await getQuestionsForLevel(level);

  const byTopic: Record<string, number> = {};
  const byDifficulty: Record<string, number> = {};

  for (const q of questions) {
    // Count by topic
    byTopic[q.topic] = (byTopic[q.topic] || 0) + 1;
    // Count by difficulty
    byDifficulty[q.difficulty] = (byDifficulty[q.difficulty] || 0) + 1;
  }

  return {
    total: questions.length,
    byTopic,
    byDifficulty,
  };
}

// ============ UTILITY FUNCTIONS ============

/**
 * Validate a quiz question object
 */
export function validateQuestion(question: unknown): question is QuizQuestion {
  if (!question || typeof question !== 'object') return false;

  const q = question as Partial<QuizQuestion>;

  return (
    typeof q.id === 'string' &&
    typeof q.level === 'string' &&
    typeof q.topic === 'string' &&
    typeof q.subtopic === 'string' &&
    typeof q.difficulty === 'string' &&
    typeof q.question === 'string' &&
    q.options !== undefined &&
    typeof q.options === 'object' &&
    typeof q.correctAnswer === 'string' &&
    typeof q.explanation === 'string' &&
    ['A', 'B', 'C', 'D'].includes(q.correctAnswer)
  );
}
