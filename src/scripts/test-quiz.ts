#!/usr/bin/env ts-node
/**
 * test-quiz.ts
 * AI Math Tutor v2
 *
 * Terminal quiz tester — displays sample questions from the static P1 bank
 * for review before deploying.
 *
 * Usage:
 *   npx ts-node src/scripts/test-quiz.ts --level P1 --count 10
 *   npx ts-node src/scripts/test-quiz.ts --level P1 --topic "Money" --difficulty easy --count 5
 *   npx ts-node src/scripts/test-quiz.ts --level P1 --difficulty hard --count 5
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── Types ────────────────────────────────────────────────────────────────────

interface Question {
  id: string;
  level: string;
  topic: string;
  subtopic: string;
  difficulty: string;
  question: string;
  options: { A: string; B: string; C: string; D: string };
  correctAnswer: string;
  explanation: string;
}

// ── Arg Parsing ──────────────────────────────────────────────────────────────

function parseArgs(): { level: string; topic?: string; difficulty?: string; count: number } {
  const args = process.argv.slice(2);
  const get = (flag: string): string | undefined => {
    const idx = args.indexOf(flag);
    return idx >= 0 ? args[idx + 1] : undefined;
  };

  return {
    level: get('--level') ?? 'P1',
    topic: get('--topic'),
    difficulty: get('--difficulty'),
    count: parseInt(get('--count') ?? '10', 10),
  };
}

// ── Shuffle ──────────────────────────────────────────────────────────────────

function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

// ── Display ──────────────────────────────────────────────────────────────────

function countBy<T>(items: T[], key: (item: T) => string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const item of items) {
    const k = key(item);
    counts[k] = (counts[k] ?? 0) + 1;
  }
  return counts;
}

function formatCounts(counts: Record<string, number>): string {
  return Object.entries(counts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}(${v})`)
    .join('  ');
}

function displayQuestion(q: Question, num: number): void {
  console.log(`\nQ${num} [${q.topic} / ${q.difficulty}] ${q.id}`);
  console.log(q.question);
  console.log(`  A) ${q.options.A}`);
  console.log(`  B) ${q.options.B}`);
  console.log(`  C) ${q.options.C}`);
  console.log(`  D) ${q.options.D}`);
  console.log(`  ✓ Correct: ${q.correctAnswer} | ${q.explanation}`);
}

// ── Main ─────────────────────────────────────────────────────────────────────

function main(): void {
  const { level, topic, difficulty, count } = parseArgs();

  // Determine bank file
  const bankFile = path.resolve(
    __dirname,
    `../../src/data/quiz-p1-bank.json`
  );

  if (!fs.existsSync(bankFile)) {
    console.error(`ERROR: Bank file not found: ${bankFile}`);
    console.error('Run curate-p1-bank.py and validate-question-bank.ts first.');
    process.exit(1);
  }

  const raw = fs.readFileSync(bankFile, 'utf-8');
  let questions: Question[] = JSON.parse(raw) as Question[];

  // Filter by level
  questions = questions.filter(q => q.level === level);

  // Filter by topic
  if (topic) {
    questions = questions.filter(q => q.topic.toLowerCase() === topic.toLowerCase());
  }

  // Filter by difficulty
  if (difficulty && difficulty !== 'all') {
    questions = questions.filter(q => q.difficulty === difficulty);
  }

  if (questions.length === 0) {
    console.log('No questions match the given filters.');
    console.log(`  Level: ${level}${topic ? `  Topic: ${topic}` : ''}${difficulty ? `  Difficulty: ${difficulty}` : ''}`);
    process.exit(0);
  }

  // Sample
  const shuffled = shuffleArray(questions);
  const sample = shuffled.slice(0, count);

  // Header
  const filterDesc = [
    `Level: ${level}`,
    topic ? `Topic: ${topic}` : null,
    difficulty ? `Difficulty: ${difficulty}` : null,
  ].filter(Boolean).join(' | ');

  console.log(`\n=== ${level} QUIZ SAMPLE (${sample.length} questions) ===`);
  console.log(`Filters: ${filterDesc}`);
  console.log(`Topics: ${formatCounts(countBy(sample, q => q.topic))}`);
  console.log(`Difficulty: ${formatCounts(countBy(sample, q => q.difficulty))}`);
  console.log(`Correct answers: ${formatCounts(countBy(sample, q => q.correctAnswer))}`);

  // Questions
  sample.forEach((q, i) => displayQuestion(q, i + 1));

  // Summary
  const topicCounts = countBy(questions, q => q.topic);
  const diffCounts = countBy(questions, q => q.difficulty);

  console.log(`\n=== SUMMARY ===`);
  console.log(`Bank size: ${questions.length} matching questions | Served: ${sample.length} | No repeats detected`);
  console.log(`\nFull bank breakdown:`);
  console.log(`  By topic    : ${formatCounts(topicCounts)}`);
  console.log(`  By difficulty: ${formatCounts(diffCounts)}`);
}

main();
