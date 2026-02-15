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
  requestedQuestionCount: number | null;
  wasQuestionCountCapped: boolean;
  maxQuestionCount: number;
}

const DEFAULT_QUESTION_COUNT = 5;
const MAX_QUESTION_COUNT = 25;

// Common number words used in quiz requests
const NUMBER_WORD_MAP: Record<string, number> = {
  'one': 1,
  'two': 2,
  'three': 3,
  'four': 4,
  'five': 5,
  'six': 6,
  'seven': 7,
  'eight': 8,
  'nine': 9,
  'ten': 10,
  'eleven': 11,
  'twelve': 12,
  'thirteen': 13,
  'fourteen': 14,
  'fifteen': 15,
  'sixteen': 16,
  'seventeen': 17,
  'eighteen': 18,
  'nineteen': 19,
  'twenty': 20,
  'twenty one': 21,
  'twenty-one': 21,
  'twenty two': 22,
  'twenty-two': 22,
  'twenty three': 23,
  'twenty-three': 23,
  'twenty four': 24,
  'twenty-four': 24,
  'twenty five': 25,
  'twenty-five': 25,
  'thirty': 30,
  'forty': 40,
  'fifty': 50,
  'sixty': 60,
  'seventy': 70,
  'eighty': 80,
  'ninety': 90,
  'hundred': 100,
};

function removeLevelMarkers(input: string): string {
  return input
    .replace(/\bP[1-6]\b/gi, ' ')
    .replace(/\bprimary\s*[1-6]\b/gi, ' ')
    .replace(/\bgrade\s*[1-6]\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractWordBasedCount(content: string): number | null {
  // Prefer explicit "... questions" phrasing first
  const contextualMatch = content.match(/\b([a-z]+(?:[-\s][a-z]+){0,2})\s+(?:questions?|qs?|problems?)\b/i);
  if (contextualMatch) {
    const phrase = contextualMatch[1].toLowerCase().trim();
    if (NUMBER_WORD_MAP[phrase] !== undefined) {
      return NUMBER_WORD_MAP[phrase];
    }
    const normalized = phrase.replace(/-/g, ' ');
    if (NUMBER_WORD_MAP[normalized] !== undefined) {
      return NUMBER_WORD_MAP[normalized];
    }
  }

  // Fallback: search anywhere in the sentence
  const phrases = Object.entries(NUMBER_WORD_MAP).sort((a, b) => b[0].length - a[0].length);
  for (const [phrase, value] of phrases) {
    const escaped = phrase.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    if (new RegExp(`\\b${escaped}\\b`, 'i').test(content)) {
      return value;
    }
  }

  return null;
}

function extractRequestedQuestionCount(content: string): number | null {
  const normalized = removeLevelMarkers(content);

  // First preference: numbers explicitly attached to question words
  const contextualNumeric = normalized.match(/\b(\d{1,3})\s*(?:questions?|qs?|problems?)\b/i)
    || normalized.match(/\b(?:questions?|qs?|problems?)\s*(?:of\s*)?(\d{1,3})\b/i);

  if (contextualNumeric?.[1]) {
    return parseInt(contextualNumeric[1], 10);
  }

  // Word-based counts, e.g. "twenty five questions"
  const wordCount = extractWordBasedCount(normalized);
  if (wordCount !== null) {
    return wordCount;
  }

  // Fallback: first standalone number after removing grade markers
  const firstNumber = normalized.match(/\b(\d{1,3})\b/);
  if (firstNumber?.[1]) {
    return parseInt(firstNumber[1], 10);
  }

  return null;
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

  // Extract requested question count and enforce hard cap
  const requestedQuestionCount = extractRequestedQuestionCount(content);
  const normalizedRequested = requestedQuestionCount === null
    ? DEFAULT_QUESTION_COUNT
    : Math.max(1, requestedQuestionCount);
  const questionCount = Math.min(normalizedRequested, MAX_QUESTION_COUNT) as QuizQuestionCount;
  const wasQuestionCountCapped = requestedQuestionCount !== null && requestedQuestionCount > MAX_QUESTION_COUNT;

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
    .replace(/\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred)\b/gi, '')
    .replace(/\b(quiz|questions?|give|me|generate|create|revision|practice|revise|some|the|for|a|an|i|want|can|you|please|hardest|harder|hard|medium|easy|difficult|challenging|super|toughest|simple|basic|beginner|about|on|of|my|do|make|try|get|with|have|that|this|it|them|best|most|really|very|just|like|show|test|from|your|could|would|should|will|need|know|help|us|we|let|go|problems?|math|maths)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim() || 'math';

  return {
    level,
    topic,
    difficulty,
    questionCount,
    requestedQuestionCount,
    wasQuestionCountCapped,
    maxQuestionCount: MAX_QUESTION_COUNT,
  };
}
