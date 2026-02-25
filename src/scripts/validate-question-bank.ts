#!/usr/bin/env ts-node
/**
 * validate-question-bank.ts
 * AI Math Tutor v2
 *
 * Hybrid validator (rules + AI) for the curated P1 static question bank.
 * Removes failed questions and writes the clean bank back to disk.
 *
 * Usage:
 *   npx ts-node src/scripts/validate-question-bank.ts
 *   npx ts-node src/scripts/validate-question-bank.ts --skip-ai   # rules only
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ── Config ───────────────────────────────────────────────────────────────────

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BANK_FILE = path.resolve(__dirname, '../../src/data/quiz-p1-bank.json');

const VALID_TOPICS = [
  'Whole Numbers',
  'Addition/Subtraction',
  'Multiplication/Division',
  'Money',
  'Time',
  'Picture Graphs',
];

const VISUAL_DEPENDENCY_PHRASES = [
  'look at',
  'shown below',
  'in the picture',
  'in the figure',
  'refer to',
  'see the diagram',
  'the image',
  'shown in the',
  'from the graph',
  'from the chart',
  'from the table',
  'the table shows',
  'the bar graph',
  'the pie chart',
];

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

interface RuleFail {
  id: string;
  rule: string;
}

interface AIFail {
  id: string;
  issue: string;
  computedAnswer?: string;
  statedAnswer?: string;
}

interface AIVerifyResult {
  solvable: boolean;
  computedAnswer: string;
  matchesStated: boolean;
  levelAppropriate: boolean;
  stepCount: number;
  issue: string | null;
}

// ── Rules Validation ─────────────────────────────────────────────────────────

function runRulesValidation(questions: Question[]): { passed: Question[]; failed: RuleFail[] } {
  const passed: Question[] = [];
  const failed: RuleFail[] = [];

  for (const q of questions) {
    const issues: string[] = [];

    // Rule 1: Required fields present
    const requiredFields = ['id', 'level', 'topic', 'subtopic', 'difficulty', 'question', 'options', 'correctAnswer', 'explanation'];
    for (const field of requiredFields) {
      if (!(field in q) || (q as unknown as Record<string, unknown>)[field] === null || (q as unknown as Record<string, unknown>)[field] === undefined) {
        issues.push(`Missing required field: ${field}`);
      }
    }

    // Rule 2: correctAnswer is A, B, C, or D
    if (!['A', 'B', 'C', 'D'].includes(q.correctAnswer)) {
      issues.push(`correctAnswer "${q.correctAnswer}" is not A/B/C/D`);
    }

    // Rule 3: All four options are non-empty
    if (q.options) {
      for (const opt of ['A', 'B', 'C', 'D'] as const) {
        const val = q.options[opt];
        if (!val || String(val).trim().length === 0) {
          issues.push(`Option ${opt} is empty`);
        }
      }
    }

    // Rule 4: No visual dependency phrases
    const questionLower = q.question.toLowerCase();
    for (const phrase of VISUAL_DEPENDENCY_PHRASES) {
      if (questionLower.includes(phrase)) {
        issues.push(`Visual dependency phrase found: "${phrase}"`);
        break;
      }
    }

    // Rule 5: Topic is in the valid P1 topic list
    if (!VALID_TOPICS.includes(q.topic)) {
      issues.push(`Topic "${q.topic}" is not in the valid P1 topic list`);
    }

    // Rule 6: Difficulty is easy, medium, or hard
    if (!['easy', 'medium', 'hard'].includes(q.difficulty)) {
      issues.push(`Difficulty "${q.difficulty}" is invalid`);
    }

    // Rule 7: Level is P1
    if (q.level !== 'P1') {
      issues.push(`Level "${q.level}" is not P1`);
    }

    // Rule 8: Question text is at least 20 characters
    if (!q.question || q.question.trim().length < 20) {
      issues.push(`Question text too short (${q.question?.length ?? 0} chars, min 20)`);
    }

    if (issues.length > 0) {
      failed.push({ id: q.id, rule: issues[0] }); // Report first issue per question
    } else {
      passed.push(q);
    }
  }

  return { passed, failed };
}

// ── AI Validation ─────────────────────────────────────────────────────────────

async function verifyQuestionWithAI(q: Question, apiKey: string, model: string): Promise<AIVerifyResult> {
  const prompt = [
    'You are a Singapore Primary 1 math teacher reviewing a quiz question. Answer in JSON only.',
    '',
    `Question: ${q.question}`,
    `Options: A) ${q.options.A}  B) ${q.options.B}  C) ${q.options.C}  D) ${q.options.D}`,
    `Stated correct answer: ${q.correctAnswer}`,
    `Stated difficulty: ${q.difficulty}`,
    '',
    'Respond with strict JSON only:',
    '{ "solvable": true/false, "computedAnswer": "A/B/C/D", "matchesStated": true/false, "levelAppropriate": true/false, "stepCount": 1, "issue": "describe issue or null" }',
  ].join('\n');

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://ai-math-tutor-v2.vercel.app',
      'X-Title': 'AI Math Tutor V2 — Bank Validator',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0,
      max_tokens: 200,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenRouter ${response.status}: ${response.statusText}`);
  }

  const data = await response.json() as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = data.choices?.[0]?.message?.content ?? '';

  // Strip markdown fences if any
  const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  const jsonStr = start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned;

  return JSON.parse(jsonStr) as AIVerifyResult;
}

async function runAIValidation(
  questions: Question[],
  apiKey: string,
  model: string
): Promise<{ passed: Question[]; failed: AIFail[] }> {
  const passed: Question[] = [];
  const failed: AIFail[] = [];

  const total = questions.length;
  let done = 0;

  // Process in small batches to avoid rate limits
  const BATCH_SIZE = 10;

  for (let i = 0; i < questions.length; i += BATCH_SIZE) {
    const batch = questions.slice(i, i + BATCH_SIZE);

    await Promise.all(
      batch.map(async (q) => {
        try {
          const result = await verifyQuestionWithAI(q, apiKey, model);

          if (!result.solvable || !result.matchesStated || !result.levelAppropriate) {
            failed.push({
              id: q.id,
              issue: result.issue ?? 'AI flagged but no issue description given',
              computedAnswer: result.computedAnswer,
              statedAnswer: q.correctAnswer,
            });
          } else {
            passed.push(q);
          }
        } catch (err) {
          // On API error, give benefit of the doubt — don't remove the question
          console.warn(`  [AI] Could not verify ${q.id}: ${(err as Error).message} — keeping question`);
          passed.push(q);
        }
      })
    );

    done += batch.length;
    process.stdout.write(`  AI verified: ${done}/${total}\r`);

    // Small delay between batches
    if (i + BATCH_SIZE < questions.length) {
      await new Promise(r => setTimeout(r, 500));
    }
  }

  process.stdout.write('\n');
  return { passed, failed };
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const skipAI = args.includes('--skip-ai');

  console.log('=== P1 Question Bank Validator ===\n');

  // Load bank
  if (!fs.existsSync(BANK_FILE)) {
    console.error(`ERROR: Bank file not found: ${BANK_FILE}`);
    console.error('Run curate-p1-bank.py first.');
    process.exit(1);
  }

  const raw = fs.readFileSync(BANK_FILE, 'utf-8');
  const questions: Question[] = JSON.parse(raw) as Question[];
  console.log(`Loaded: ${questions.length} questions from ${path.basename(BANK_FILE)}\n`);

  // ── Part A: Rules ──────────────────────────────────────────────────────────
  console.log('--- Part A: Rules Validation ---');
  const { passed: rulesPassed, failed: rulesFailed } = runRulesValidation(questions);
  console.log(`Rules passed: ${rulesPassed.length} / ${questions.length}`);

  if (rulesFailed.length > 0) {
    console.log(`Rules failed: ${rulesFailed.length}`);
    for (const f of rulesFailed) {
      console.log(`  - ${f.id}: ${f.rule}`);
    }
  } else {
    console.log('Rules failed: 0');
  }

  // ── Part B: AI ─────────────────────────────────────────────────────────────
  let finalPassed = rulesPassed;
  let aiFailed: AIFail[] = [];

  if (!skipAI) {
    const apiKey = process.env['OPENROUTER_API_KEY'];
    if (!apiKey) {
      console.log('\n[WARNING] OPENROUTER_API_KEY not set — skipping AI validation.');
      console.log('  Set OPENROUTER_API_KEY in your environment, or run with --skip-ai.');
    } else {
      const model = process.env['OPENROUTER_MODEL'] ?? 'minimax/minimax-m2.5';
      console.log(`\n--- Part B: AI Validation (model: ${model}) ---`);
      console.log(`Verifying ${rulesPassed.length} questions …`);

      const { passed: aiPassed, failed: aiFail } = await runAIValidation(rulesPassed, apiKey, model);
      aiFailed = aiFail;
      finalPassed = aiPassed;

      console.log(`AI passed: ${aiPassed.length} / ${rulesPassed.length}`);
      if (aiFailed.length > 0) {
        console.log(`AI failed: ${aiFailed.length}`);
        for (const f of aiFailed) {
          const answerInfo = f.computedAnswer && f.statedAnswer && f.computedAnswer !== f.statedAnswer
            ? ` (computed: ${f.computedAnswer}, stated: ${f.statedAnswer})`
            : '';
          console.log(`  - ${f.id}${answerInfo}: ${f.issue}`);
        }
      }
    }
  } else {
    console.log('\n[--skip-ai] AI validation skipped.');
  }

  // ── Write final bank ───────────────────────────────────────────────────────
  fs.writeFileSync(BANK_FILE, JSON.stringify(finalPassed, null, 2), 'utf-8');

  // ── Report ─────────────────────────────────────────────────────────────────
  console.log('\n=== VALIDATION REPORT ===');
  console.log(`Total          : ${questions.length}`);
  console.log(`Rules passed   : ${rulesPassed.length}`);
  if (!skipAI && aiFailed.length + finalPassed.length > 0) {
    console.log(`AI passed      : ${finalPassed.length}`);
  }
  console.log(`Final passing  : ${finalPassed.length}`);
  console.log(`Removed        : ${questions.length - finalPassed.length}`);
  console.log(`\nFinal bank: ${finalPassed.length} questions written to ${BANK_FILE}`);

  if (finalPassed.length < 150) {
    console.log('\n[WARNING] Final bank has fewer than 150 questions. Re-run curation with looser filters.');
  }
}

main().catch((err) => {
  console.error('Validator failed:', err);
  process.exit(1);
});
