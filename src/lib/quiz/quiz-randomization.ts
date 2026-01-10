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

/**
 * Shuffle an array and return the first n elements
 */
export function shuffleAndTake<T>(array: T[], count: number): T[] {
  return shuffleArray(array).slice(0, Math.min(count, array.length));
}

// ============ QUESTION RANDOMIZATION ============

/**
 * Get a random subset of questions without duplicates
 */
export function getRandomQuestions(
  questions: QuizQuestion[],
  count: number
): QuizQuestion[] {
  if (count >= questions.length) {
    return shuffleArray(questions);
  }
  return shuffleAndTake(questions, count);
}

/**
 * Weighted random selection by topic
 * Ensures topic distribution based on weights
 */
export function selectQuestionsByWeight(
  allQuestions: QuizQuestion[],
  count: number,
  weights?: Record<string, number>
): QuizQuestion[] {
  if (!weights || Object.keys(weights).length === 0) {
    return getRandomQuestions(allQuestions, count);
  }

  // Group questions by topic
  const byTopic = new Map<string, QuizQuestion[]>();
  for (const q of allQuestions) {
    if (!byTopic.has(q.topic)) {
      byTopic.set(q.topic, []);
    }
    byTopic.get(q.topic)!.push(q);
  }

  // Calculate total weight
  const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0);

  // Select questions based on weights
  const selected: QuizQuestion[] = [];
  let remaining = count;

  for (const [topic, weight] of Object.entries(weights)) {
    if (remaining <= 0) break;

    const topicQuestions = byTopic.get(topic) || [];
    const topicCount = Math.round((weight / totalWeight) * count);
    const actualCount = Math.min(topicCount, topicCount);

    const fromTopic = shuffleArray(topicQuestions).slice(0, actualCount);
    selected.push(...fromTopic);
    remaining -= fromTopic.length;
  }

  // If we need more questions, fill randomly from remaining
  if (selected.length < count) {
    const usedIds = new Set(selected.map(q => q.id));
    const remaining = allQuestions.filter(q => !usedIds.has(q.id));
    selected.push(...shuffleAndTake(remaining, count - selected.length));
  }

  return shuffleArray(selected);
}

/**
 * Ensure balanced topic distribution
 * Tries to get at least minPerTopic from each topic
 */
export function selectBalancedQuestions(
  allQuestions: QuizQuestion[],
  count: number,
  topics: string[],
  minPerTopic: number = 1
): QuizQuestion[] {
  const selected: QuizQuestion[] = [];
  const usedIds = new Set<string>();

  // First, ensure minimum from each topic
  for (const topic of topics) {
    const topicQuestions = allQuestions.filter(q => q.topic === topic);
    const available = topicQuestions.filter(q => !usedIds.has(q.id));

    if (available.length > 0) {
      const toAdd = shuffleArray(available).slice(0, minPerTopic);
      selected.push(...toAdd);
      toAdd.forEach(q => usedIds.add(q.id));
    }
  }

  // Fill the rest randomly
  if (selected.length < count) {
    const remaining = allQuestions.filter(q => !usedIds.has(q.id));
    const toAdd = shuffleAndTake(remaining, count - selected.length);
    selected.push(...toAdd);
  }

  return shuffleArray(selected).slice(0, count);
}

// ============ OPTION RANDOMIZATION ============

/**
 * Shuffle options and return mapping for correct answer
 * Returns the shuffled options and the new position of the correct answer
 */
export function shuffleOptions(options: QuizOptions): {
  shuffled: QuizOptions;
  correctShuffled: QuizOption;
  mapping: Record<QuizOption, QuizOption>;
} {
  const optionEntries: [QuizOption, string][] = [
    ['A', options.A],
    ['B', options.B],
    ['C', options.C],
    ['D', options.D],
  ];

  // Shuffle the entries
  const shuffledEntries = shuffleArray(optionEntries);

  // Build the new options object
  const shuffled: QuizOptions = {
    A: shuffledEntries[0][1],
    B: shuffledEntries[1][1],
    C: shuffledEntries[2][1],
    D: shuffledEntries[3][1],
  };

  return {
    shuffled,
    // This will be set by the caller based on original correctAnswer
    correctShuffled: 'A',
    mapping: {
      A: 'A', // Will be updated by caller
      B: 'B',
      C: 'C',
      D: 'D',
    },
  };
}

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

// ============ SEED-BASED RANDOMNESS (for testing) ============

/**
 * Seeded random number generator
 * Useful for reproducible test scenarios
 */
export class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  /**
   * Generate a random number between 0 and 1
   */
  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  /**
   * Generate a random integer between min and max (inclusive)
   */
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /**
   * Shuffle an array using the seed
   */
  shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i);
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}

/**
 * Get random questions with a seed (for testing)
 */
export function getRandomQuestionsSeeded(
  questions: QuizQuestion[],
  count: number,
  seed: number
): QuizQuestion[] {
  const rng = new SeededRandom(seed);

  if (count >= questions.length) {
    return rng.shuffleArray(questions);
  }

  // Fisher-Yates with seeded random, stopping at count
  const shuffled = [...questions];
  for (let i = shuffled.length - 1; i > 0 && shuffled.length > count; i--) {
    const j = rng.nextInt(0, i);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled.slice(0, count);
}

// ============ UTILITY FUNCTIONS ============

/**
 * Get a random item from an array
 */
export function randomItem<T>(array: T[]): T | undefined {
  if (array.length === 0) return undefined;
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Get a random integer between min and max (inclusive)
 */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Get a random float between min and max
 */
export function randomFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

/**
 * Generate a random unique ID
 */
export function generateUniqueId(): string {
  return Math.random().toString(36).substring(2, 9);
}
