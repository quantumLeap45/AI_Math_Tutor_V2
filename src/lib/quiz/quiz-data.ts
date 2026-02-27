/**
 * Quiz Data Access Layer
 * AI Math Tutor v2
 *
 * Handles loading and accessing quiz question data.
 * All quiz data is stored in /data/quiz-p1-bank.json and /data/quiz-p2-bank.json
 */

import {
  QuizQuestion,
  QuizConfig,
  PrimaryLevel,
  QuizDifficulty,
  QuizOption,
  P1_TOPICS,
  P2_TOPICS,
  P3_TOPICS,
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
    const data = await import('@/data/quiz-p1-bank.json');
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
      templateId: q.template_id,
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
    const data = await import('@/data/quiz-p2-bank.json');
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
      templateId: q.template_id,
    }));

    P2_QUESTIONS_CACHE = questions;
    return questions;
  } catch (error) {
    console.error('Failed to load P2 quiz questions:', error);
    return [];
  }
}

/**
 * P3 Quiz Questions (imported from JSON file)
 * This is dynamically imported to avoid SSR issues
 */
let P3_QUESTIONS_CACHE: QuizQuestion[] | null = null;

/**
 * Load and parse P3 quiz questions from JSON
 */
async function loadP3Questions(): Promise<QuizQuestion[]> {
  if (P3_QUESTIONS_CACHE) {
    return P3_QUESTIONS_CACHE;
  }

  try {
    const data = await import('@/data/quiz-p3-bank.json');
    const rawQuestions = data.default || data;

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
      templateId: q.template_id,
    }));

    P3_QUESTIONS_CACHE = questions;
    return questions;
  } catch (error) {
    console.error('Failed to load P3 quiz questions:', error);
    return [];
  }
}

// ============ PUBLIC API ============

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
  if (level === 'P3') {
    return loadP3Questions();
  }
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

  const topics = config.topics ?? [];
  if (topics.length > 0) {
    filtered = filtered.filter(q => topics.includes(q.topic));
  }

  // Filter by difficulty (if specified)
  if (config.difficulty && config.difficulty !== 'all') {
    filtered = filtered.filter(q => q.difficulty === config.difficulty);
  }

  return filtered;
}

/**
 * Get a random subset of questions matching the configuration.
 *
 * Applies three levels of diversity:
 *   1. Topic-level: questions are distributed evenly across topics.
 *   2. Subtopic-level: questions are spread across subtopics within each topic.
 *   3. Template-level: within a single quiz, max 1 question per template group.
 *      Across quizzes, questions whose template was seen recently are deprioritised
 *      (pushed to the back of the selection pool) but not hard-excluded, so the
 *      engine never runs out of questions even with a narrow topic filter.
 *
 * @param config           Quiz configuration (level, topics, difficulty, count)
 * @param count            Number of questions to return
 * @param cooldownTemplates Set of template_id values seen in the last N quizzes.
 *                          Questions matching these are used only as a last resort.
 */
export async function getRandomQuestions(
  config: QuizConfig,
  count: number,
  cooldownTemplates: ReadonlySet<string> = new Set()
): Promise<QuizQuestion[]> {
  const available = await getQuestionsForConfig(config);
  if (available.length === 0) return [];

  const actualCount = Math.min(count, available.length);

  // ── 0. Split pool into "fresh" (not recently seen) and "cooled" (seen recently)
  const freshPool = shuffleArray(available.filter(q => !q.templateId || !cooldownTemplates.has(q.templateId)));
  const cooledPool = shuffleArray(available.filter(q => q.templateId && cooldownTemplates.has(q.templateId)));

  // ── Helper: pick up to `slots` questions from a pool with subtopic diversity ─
  function pickWithDiversity(pool: QuizQuestion[], slots: number, usedTemplates: Set<string>): QuizQuestion[] {
    // Group by subtopic
    const bySubtopic = new Map<string, QuizQuestion[]>();
    for (const q of pool) {
      if (!bySubtopic.has(q.subtopic)) bySubtopic.set(q.subtopic, []);
      bySubtopic.get(q.subtopic)!.push(q);
    }

    const subtopics = shuffleArray(Array.from(bySubtopic.keys()));
    const maxPerSubtopic = Math.max(2, Math.ceil(slots / Math.max(subtopics.length, 1)));

    const usedSubtopicCount = new Map<string, number>();
    const picked: QuizQuestion[] = [];
    let pass = 0;

    while (picked.length < slots && pass < slots * Math.max(subtopics.length, 1) * 2) {
      const sub = subtopics[pass % subtopics.length];
      const usedForSub = usedSubtopicCount.get(sub) ?? 0;
      const subPool = bySubtopic.get(sub)!;

      // Scan this subtopic's remaining questions for one with a fresh template
      let found = false;
      for (let i = usedForSub; i < subPool.length && i < usedForSub + maxPerSubtopic; i++) {
        const candidate = subPool[i];
        if (!candidate.templateId || !usedTemplates.has(candidate.templateId)) {
          picked.push(candidate);
          if (candidate.templateId) usedTemplates.add(candidate.templateId);
          usedSubtopicCount.set(sub, i + 1);
          found = true;
          break;
        }
        // Skip (same template already used in this quiz)
        usedSubtopicCount.set(sub, i + 1);
      }
      if (!found) usedSubtopicCount.set(sub, (usedSubtopicCount.get(sub) ?? 0) + 1);

      pass++;
    }

    return picked;
  }

  // ── 1. Group fresh pool by topic ────────────────────────────────────────────
  const byTopicFresh = new Map<string, QuizQuestion[]>();
  for (const q of freshPool) {
    if (!byTopicFresh.has(q.topic)) byTopicFresh.set(q.topic, []);
    byTopicFresh.get(q.topic)!.push(q);
  }

  const byTopicCooled = new Map<string, QuizQuestion[]>();
  for (const q of cooledPool) {
    if (!byTopicCooled.has(q.topic)) byTopicCooled.set(q.topic, []);
    byTopicCooled.get(q.topic)!.push(q);
  }

  // Collect all topics that have at least one question
  const allTopics = shuffleArray(
    Array.from(new Set([...byTopicFresh.keys(), ...byTopicCooled.keys()]))
  );
  const numTopics = allTopics.length;

  // ── 2. Allocate slots evenly across topics ──────────────────────────────────
  const slotsPerTopic = new Map<string, number>();
  const base = Math.floor(actualCount / numTopics);
  const extra = actualCount % numTopics;
  allTopics.forEach((topic, i) => {
    slotsPerTopic.set(topic, base + (i < extra ? 1 : 0));
  });

  // ── 3. For each topic, pick with diversity — fresh first, cooled as fallback ─
  const selected: QuizQuestion[] = [];
  const usedTemplatesThisQuiz = new Set<string>();

  for (const topic of allTopics) {
    const slots = slotsPerTopic.get(topic)!;
    const freshForTopic = byTopicFresh.get(topic) ?? [];
    const cooledForTopic = byTopicCooled.get(topic) ?? [];

    // Try to fill from fresh pool first
    const fromFresh = pickWithDiversity(freshForTopic, slots, usedTemplatesThisQuiz);
    selected.push(...fromFresh);

    // Fill remaining slots from cooled pool if fresh wasn't enough
    const remaining = slots - fromFresh.length;
    if (remaining > 0) {
      const fromCooled = pickWithDiversity(cooledForTopic, remaining, usedTemplatesThisQuiz);
      selected.push(...fromCooled);
    }
  }

  // ── 4. Top-up with any remaining questions (fresh first) if still short ──────
  if (selected.length < actualCount) {
    const selectedIds = new Set(selected.map(q => q.id));
    const topUpPool = shuffleArray([
      ...freshPool.filter(q => !selectedIds.has(q.id)),
      ...cooledPool.filter(q => !selectedIds.has(q.id)),
    ]);
    for (const q of topUpPool) {
      if (selected.length >= actualCount) break;
      selected.push(q);
    }
  }

  return shuffleArray(selected);
}

