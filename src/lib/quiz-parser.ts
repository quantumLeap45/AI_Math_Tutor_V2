/**
 * Quiz Parser
 * AI Math Tutor v2
 *
 * Pure function that extracts quiz settings (level, topic, difficulty, count)
 * from natural language user text like "Give me 5 P2 fractions questions".
 */

import { PrimaryLevel, QuizDifficulty, QuizQuestionCount } from '@/types';

export interface ParsedQuizSettings {
  level: PrimaryLevel;
  topic: string;
  difficulty: QuizDifficulty;
  questionCount: QuizQuestionCount;
}

/**
 * Parse quiz settings from natural language input.
 *
 * @param content - The user's message text
 * @returns Parsed quiz settings with defaults for any undetected fields
 */
export function parseQuizSettings(content: string): ParsedQuizSettings {
  // Extract level (P1-P6)
  const levelMatch = content.match(/\b(P[1-6])\b/i);
  const level = (levelMatch?.[1]?.toUpperCase() || 'P4') as PrimaryLevel;

  // Extract question count BEFORE topic parsing so numbers are removed
  // Check largest first; use word boundaries to avoid matching "5" inside "P5"
  const questionCount = ([20, 15, 10, 5].find(n => new RegExp(`\\b${n}\\b`).test(content)) || 5) as QuizQuestionCount;

  // Extract difficulty — check multi-word phrases first
  let difficulty: QuizDifficulty = 'medium';
  if (/\b(super\s+hard|very\s+hard|hardest|toughest|most\s+difficult)\b/i.test(content)) difficulty = 'hard';
  else if (/\b(hard|difficult|challenging)\b/i.test(content)) difficulty = 'hard';
  else if (/\b(easy|simple|basic|beginner)\b/i.test(content)) difficulty = 'easy';
  else if (/\bmedium\b/i.test(content)) difficulty = 'medium';

  // Extract topic by removing noise words, level, difficulty, numbers, and number words
  const topic = content
    .replace(/\b(P[1-6])\b/gi, '')
    .replace(/\b\d+\b/g, '')
    .replace(/\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty)\b/gi, '')
    .replace(/\b(quiz|questions?|give|me|generate|create|revision|practice|revise|some|the|for|a|an|i|want|can|you|please|hardest|harder|hard|medium|easy|difficult|challenging|super|toughest|simple|basic|beginner|about|on|of|my|do|make|try|get|with|have|that|this|it|them|best|most|really|very|just|like|show|test|from|your|could|would|should|will|need|know|help|us|we|let|go|problems?|math|maths)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim() || 'math';

  return { level, topic, difficulty, questionCount };
}
