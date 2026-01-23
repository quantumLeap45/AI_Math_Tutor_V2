/**
 * Quiz Retrieval via RAG
 * AI Math Tutor v2
 *
 * Retrieves quiz-style questions using RAG for use as style reference
 * when generating new quiz questions via AI.
 */

import { searchByFilters } from './search';
import type { RAGQuestion, RAGSearchFilters, Difficulty } from './types';

/**
 * Quiz context result - questions for style reference
 */
export interface QuizContext {
  /** Retrieved style reference questions (do NOT copy) */
  questions: RAGQuestion[];
  /** Number of style examples retrieved */
  count: number;
}

/**
 * Difficulty mapping for quiz generation
 */
const QUIZ_DIFFICULTY_MAP: Record<string, Difficulty> = {
  'beginner': 'Easy',
  'easy': 'Easy',
  'intermediate': 'Medium',
  'medium': 'Medium',
  'advanced': 'Hard',
  'hard': 'Hard',
};

/**
 * Get quiz context via RAG for style reference
 * @param topic - Math topic (e.g., "Addition", "Fractions")
 * @param difficulty - Difficulty level (beginner/intermediate/advanced)
 * @param count - Number of style examples to retrieve (default: 3)
 * @returns Quiz context with style reference questions
 */
export async function getQuizContext(
  topic: string,
  difficulty: string = 'intermediate',
  count: number = 3
): Promise<RAGQuestion[]> {
  // Map difficulty string to Difficulty type
  const mappedDifficulty = QUIZ_DIFFICULTY_MAP[difficulty.toLowerCase()] || 'Medium';

  // Build RAG search filters
  const filters: RAGSearchFilters = {
    topic,
    maxResults: count,
  };

  // Search for relevant questions by topic
  const context = await searchByFilters(filters, `${topic} math questions`);

  // Return the example questions for style reference
  return context.examples;
}
