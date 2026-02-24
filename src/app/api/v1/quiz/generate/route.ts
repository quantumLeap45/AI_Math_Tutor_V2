/**
 * Quiz Generation API Route (v1)
 * AI Math Tutor v2
 *
 * Generates MCQ quiz questions using Gemini + RAG.
 * Questions are created fresh each time based on user's topic request.
 *
 * Refactored to use enterprise-grade infrastructure:
 * - Centralized config service
 * - Zod validation schemas
 * - Standardized error handling
 */

import { NextRequest } from 'next/server';
import { GoogleGenAI, Content } from '@google/genai';
import { searchByFilters } from '@/lib/rag/search';
import type { GradeLevel } from '@/lib/rag/types';
import { isPineconeConfigured } from '@/lib/rag/pinecone';
import { checkHealth } from '@/lib/gemini';
import { QuizQuestion, PrimaryLevel, QuizOption, QUIZ_QUESTION_COUNT_MAX } from '@/types';
import { config } from '@/config';
import { formatLatexToKidFriendly } from '@/lib/math-format';
import { validateQuizBatch, QuizIntegrityIssue } from '@/lib/quiz/integrity';
import { validateQuizWithAI, AIValidatorIssue } from '@/lib/quiz/ai-validator';
import {
  validateQuizRequest,
  QuizRequest,
  formatZodError,
} from '@/lib/validation';
import {
  errorToResponse,
  ValidationError,
  AIError,
  QuotaError,
  RateLimitError,
  ErrorCode,
} from '@/lib/errors';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { z } from 'zod';

export const runtime = 'nodejs';

// Model configuration from config
const MODEL_NAME = config.getGemini().model;
const MAX_VALIDATION_ROUNDS = 2;
const VALIDATION_TIME_BUDGET_MS = 10_000; // 10s — after this, skip AI validation if deterministic checks pass
const QUIZ_GENERATION_FAILURE_MESSAGE = 'An error occurred during quiz generation. Please try again.';

interface QuizQualityIssue {
  questionIndex: number;
  code: string;
  message: string;
  source: 'rule' | 'ai';
  blocking: boolean;
  excerpt?: string;
}

/**
 * Thrown when generated questions violate text-only quiz constraints.
 */
class QuizContentGuardrailError extends Error {
  issues: QuizQualityIssue[];

  constructor(message: string, issues: QuizQualityIssue[]) {
    super(message);
    this.name = 'QuizContentGuardrailError';
    this.issues = issues;
  }
}

// Quiz generation system prompt — streamlined for better model performance
const QUIZ_GENERATION_PROMPT = `You are an expert Singapore Primary Math question writer. Create ORIGINAL multiple-choice questions in the MOE style.

## RULES
1. Create ORIGINAL questions — do not copy from any examples provided
2. Each question: 4 options (A, B, C, D), exactly ONE correct
3. Include a concise explanation for the correct answer
4. Every question must be solvable from text alone — no diagrams needed

## MATH ACCURACY (MANDATORY)
For EVERY question, before including it:
1. Write the question with your chosen numbers
2. Solve it yourself — compute the actual answer
3. Verify your answer matches one of the four options
4. If it doesn't match, change the numbers and redo
5. Countable items (people, objects) MUST be whole numbers
6. Money must be valid currency amounts (e.g., $1.50 not $1.333)
7. If the math doesn't work cleanly, start over with different numbers

## DIFFICULTY CALIBRATION (CRITICAL)
Difficulty is RELATIVE TO THE LEVEL — what is "hard" for P1 is "easy" for P3.

### P1-P2 Difficulty:
- Easy: Single-step, small numbers (e.g., "3 + 5 = ?", "Count the shapes")
- Medium: Two-step problem or numbers requiring carrying/borrowing (e.g., "Siti has 15 stickers. She gives away 8 and gets 5 more. How many now?")
- Hard: Multi-step word problem with comparison or logic (e.g., "Ahmad has 12 more stickers than Mei. Together they have 40. How many does Mei have?")

### P3-P4 Difficulty:
- Easy: Single concept, straightforward (e.g., "What is 3/4 of 20?")
- Medium: Two concepts combined (e.g., "A rectangle has length 12 cm and width 8 cm. Find its area and perimeter.")
- Hard: Multi-step word problem requiring careful reading (e.g., "Ahmad buys 3 books at $4.50 each and pays with a $20 note. He uses the change to buy stickers at $0.60 each. How many stickers can he buy?")

### P5-P6 Difficulty:
- Easy: Direct calculation or single-concept application (e.g., "Express 3/5 as a percentage")
- Medium: Word problem with 2-3 steps (e.g., "Ahmad has 3/4 of a cake. He eats 1/3 of it. How much is left?")
- Hard: Heuristic word problems requiring non-obvious reasoning:
  * MUST be a word problem, never a raw equation
  * Requires forming the equation from the story, not just solving a given one
  * Uses before/after models, constant-part reasoning, working backwards, or multi-concept integration
  * Example patterns: "A train goes at speed X one way and speed Y back, find average speed", "After giving away 1/3, the ratio changed from 5:3 to 2:1, find original", "Two taps fill a tank at different rates"
  * If a P5-P6 student can solve it in under 30 seconds mentally, it is NOT hard

## TOPIC HANDLING
- If topic is generic ("math"), create a diverse mix appropriate for the level
- Set the "topic" field to the actual math concept (e.g., "Fractions"), not the user's input

## EXPLANATION FORMAT
- Max 2-3 sentences. Format: "Step 1: [step]. Step 2: [step]. Answer: [result]."

## SINGAPORE CONTEXT
- SGD for money, Singaporean names, local references where appropriate

## FORMAT
- Use "x" for multiplication, "/" for fractions, plain text only. No LaTeX.
- Return ONLY a JSON array — no code fences, no extra text

## JSON SCHEMA (per question):
{ "id": "Generated-<level>-<topic>-<N>", "level": "P1"-"P6", "topic": "<math topic>", "subtopic": "<specific>", "difficulty": "easy"|"medium"|"hard", "question": "<text>", "options": { "A": "", "B": "", "C": "", "D": "" }, "correctAnswer": "A"|"B"|"C"|"D", "explanation": "<concise>" }`;

/** Shape of a question parsed from AI-generated JSON (before validation) */
interface RawGeneratedQuestion {
  id?: string;
  level?: string;
  topic?: string;
  subtopic?: string;
  difficulty?: string;
  question?: string;
  options?: { A?: string; B?: string; C?: string; D?: string };
  correctAnswer?: string;
  explanation?: string;
  imageUrl?: string;
  imageAlt?: string;
}

/**
 * Parse quiz questions from AI response
 */
function parseQuizQuestions(response: string, expectedCount: number, level: PrimaryLevel, topic: string): QuizQuestion[] {
  try {
    // Strip markdown code fences if present
    const cleaned = response.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

    // Try to extract JSON array from response
    let jsonMatch = cleaned.match(/\[[\s\S]*\]/);

    // If no match (possibly truncated response), try to repair by closing the array
    if (!jsonMatch) {
      // Find the opening bracket
      const openIdx = cleaned.indexOf('[');
      if (openIdx >= 0) {
        let partial = cleaned.substring(openIdx);
        // Try to close any incomplete objects and the array
        // Remove trailing incomplete object (no closing })
        const lastCompleteObj = partial.lastIndexOf('}');
        if (lastCompleteObj > 0) {
          partial = partial.substring(0, lastCompleteObj + 1) + ']';
          jsonMatch = partial.match(/\[[\s\S]*\]/);
        }
      }
    }

    if (!jsonMatch) {
      throw new Error('No JSON array found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    if (!Array.isArray(parsed)) {
      throw new Error('Response is not an array');
    }

    // Validate and transform each question
    const questions: QuizQuestion[] = parsed.map((q: RawGeneratedQuestion, index: number) => {
      // Validate required fields
      if (!q.question || !q.options || !q.correctAnswer || !q.explanation) {
        throw new Error(`Question ${index + 1} missing required fields`);
      }

      // Validate options
      if (!q.options.A || !q.options.B || !q.options.C || !q.options.D) {
        throw new Error(`Question ${index + 1} has incomplete options`);
      }

      // Validate correctAnswer
      if (!['A', 'B', 'C', 'D'].includes(q.correctAnswer)) {
        throw new Error(`Question ${index + 1} has invalid correctAnswer: ${q.correctAnswer}`);
      }

      return {
        id: q.id || `Generated-${level}-${topic}-${index + 1}`,
        level: (q.level || level) as PrimaryLevel,
        topic: q.topic || topic,
        subtopic: q.subtopic || topic,
        difficulty: (q.difficulty || 'medium') as QuizQuestion['difficulty'],
        question: q.question,
        options: {
          A: q.options.A,
          B: q.options.B,
          C: q.options.C,
          D: q.options.D,
        },
        correctAnswer: q.correctAnswer as QuizOption,
        explanation: q.explanation,
        ...(q.imageUrl && { imageUrl: q.imageUrl }),
        ...(q.imageAlt && { imageAlt: q.imageAlt }),
      };
    });

    if (questions.length === 0) {
      throw new Error('No valid questions generated');
    }

    // Enforce exact question count — trim if AI generated more than requested
    const trimmed = questions.length > expectedCount
      ? questions.slice(0, expectedCount)
      : questions;

    if (trimmed.length < expectedCount) {
      throw new Error(`Generated ${trimmed.length} questions, expected ${expectedCount}`);
    }

    // Server-side sanitization: strip any LaTeX that slipped through despite prompt rules
    const sanitized = trimmed.map(q => ({
      ...q,
      question: formatLatexToKidFriendly(q.question),
      options: {
        A: formatLatexToKidFriendly(q.options.A),
        B: formatLatexToKidFriendly(q.options.B),
        C: formatLatexToKidFriendly(q.options.C),
        D: formatLatexToKidFriendly(q.options.D),
      },
      explanation: formatLatexToKidFriendly(q.explanation),
    }));

    return sanitized;
  } catch (error) {
    console.error('Failed to parse quiz questions:', error);
    throw new Error(`Failed to parse quiz questions: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

function shuffleQuestions(questions: QuizQuestion[]): QuizQuestion[] {
  const shuffled = [...questions];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function summarizeValidationIssues(issues: QuizQualityIssue[]): string {
  return issues
    .slice(0, 5)
    .map(issue => `Q${issue.questionIndex + 1} ${issue.code}`)
    .join('; ');
}

function buildQualityRetryInstruction(issues: QuizQualityIssue[], replacementCount: number): string {
  const issueHints = issues
    .slice(0, 6)
    .map(issue => `Q${issue.questionIndex + 1}: ${issue.code} (${issue.message})`)
    .join('\n- ');

  return [
    `REGENERATE EXACTLY ${replacementCount} NEW QUESTIONS to replace failed ones.`,
    'Do not repeat previously generated wording.',
    'Fix these failures explicitly:',
    `- ${issueHints}`,
    'Return only valid JSON array with exactly the requested number of replacement questions.',
  ].join('\n');
}

function toRuleQualityIssues(issues: QuizIntegrityIssue[]): QuizQualityIssue[] {
  return issues.map(issue => ({
    questionIndex: issue.questionIndex,
    code: issue.code,
    message: issue.message,
    source: 'rule',
    blocking: true,
    excerpt: issue.excerpt,
  }));
}

function toAIQualityIssues(issues: AIValidatorIssue[]): QuizQualityIssue[] {
  const CRITICAL_REASON_TOKENS = [
    'LOGIC_CONTRADICTION',
    'MATH_INCORRECT',
    'ANSWER_KEY_MISMATCH',
    'MULTIPLE_CORRECT_OPTIONS',
    'NO_CORRECT_OPTION',
    'UNSOLVABLE_TEXT_ONLY',
    'VISUAL_DEPENDENCY',
  ];

  return issues.map(issue => ({
    questionIndex: issue.questionIndex,
    code: issue.reasonCodes.join('|'),
    message: issue.message,
    source: 'ai',
    blocking: issue.severity === 'critical'
      && issue.reasonCodes.some(code => CRITICAL_REASON_TOKENS.includes(code)),
  }));
}

/**
 * Generate quiz questions using AI
 */
async function generateQuizWithGemini(
  topic: string,
  level: PrimaryLevel,
  count: number,
  difficulty: string,
  ragContext?: string,
  qualityInstruction?: string
): Promise<QuizQuestion[]> {
  const apiKey = config.getGemini().apiKey;
  if (!apiKey) {
    throw new AIError(
      ErrorCode.AI_UNAVAILABLE,
      'AI service is not configured. Please contact support.'
    );
  }

  // Initialize the Gemini client
  const ai = new GoogleGenAI({ apiKey });

  // Build the prompt
  const difficultyPrompt = difficulty === 'all'
    ? 'a mix of easy, medium, and hard'
    : difficulty;

  const userPrompt = ragContext
    ? `${ragContext}\n\nBased on the style examples above, generate EXACTLY ${count} ${difficultyPrompt} multiple-choice questions for ${level} students on the topic of "${topic}". Not more, not less — exactly ${count} questions.`
    : `Generate EXACTLY ${count} ${difficultyPrompt} multiple-choice questions for ${level} students on the topic of "${topic}". Not more, not less — exactly ${count} questions.`;

  const finalPrompt = qualityInstruction
    ? `${userPrompt}\n\n${qualityInstruction}`
    : userPrompt;

  const contents: Content[] = [
    { role: 'user', parts: [{ text: finalPrompt }] },
  ];

  try {
    // Use the same API pattern as lib/gemini.ts
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents,
      config: {
        systemInstruction: QUIZ_GENERATION_PROMPT,
        temperature: 0.4,
        maxOutputTokens: 16000,
      },
    });

    const text = response.text || '';
    if (!text) {
      throw new Error('Empty response from Gemini');
    }

    return parseQuizQuestions(text, count, level, topic);
  } catch (error) {
    console.error('Gemini quiz generation error:', error);
    throw error;
  }
}

/**
 * Generate quiz questions using OpenRouter (OpenAI-compatible API)
 * Used as primary provider when configured, with Gemini as fallback.
 */
async function generateQuizWithOpenRouter(
  topic: string,
  level: PrimaryLevel,
  count: number,
  difficulty: string,
  ragContext?: string,
  qualityInstruction?: string
): Promise<QuizQuestion[]> {
  const { apiKey, model } = config.getOpenRouter();

  const difficultyPrompt = difficulty === 'all'
    ? 'a mix of easy, medium, and hard'
    : difficulty;

  const userPrompt = ragContext
    ? `${ragContext}\n\nBased on the style examples above, generate EXACTLY ${count} ${difficultyPrompt} multiple-choice questions for ${level} students on the topic of "${topic}". Not more, not less — exactly ${count} questions.`
    : `Generate EXACTLY ${count} ${difficultyPrompt} multiple-choice questions for ${level} students on the topic of "${topic}". Not more, not less — exactly ${count} questions.`;

  const finalPrompt = qualityInstruction
    ? `${userPrompt}\n\n${qualityInstruction}`
    : userPrompt;

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://ai-math-tutor-v2.vercel.app',
        'X-Title': 'AI Math Tutor V2',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: QUIZ_GENERATION_PROMPT },
          { role: 'user', content: finalPrompt },
        ],
        temperature: 0.4,
        max_tokens: 16000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`OpenRouter API error: ${response.status} ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '';

    if (!text) {
      throw new Error('Empty response from OpenRouter');
    }

    return parseQuizQuestions(text, count, level, topic);
  } catch (error) {
    console.error('OpenRouter quiz generation error:', error);
    throw error;
  }
}

interface GenerateQuizBatchArgs {
  useOpenRouter: boolean;
  topic: string;
  level: PrimaryLevel;
  count: number;
  difficulty: string;
  ragContext?: string;
  qualityInstruction?: string;
}

async function generateQuizBatch(args: GenerateQuizBatchArgs): Promise<QuizQuestion[]> {
  return args.useOpenRouter
    ? generateQuizWithOpenRouter(
      args.topic,
      args.level,
      args.count,
      args.difficulty,
      args.ragContext,
      args.qualityInstruction
    )
    : generateQuizWithGemini(
      args.topic,
      args.level,
      args.count,
      args.difficulty,
      args.ragContext,
      args.qualityInstruction
    );
}

async function generateValidatedQuiz(
  args: Omit<GenerateQuizBatchArgs, 'qualityInstruction'>
): Promise<QuizQuestion[]> {
  const startTime = Date.now();
  let questions = await generateQuizBatch(args);
  let lastIssues: QuizQualityIssue[] = [];

  for (let round = 1; round <= MAX_VALIDATION_ROUNDS; round++) {
    const elapsed = Date.now() - startTime;

    // Time budget exceeded — skip the expensive AI validation call.
    // If deterministic (rule) checks pass, deliver the quiz immediately.
    if (elapsed > VALIDATION_TIME_BUDGET_MS) {
      const ruleIssues = toRuleQualityIssues(validateQuizBatch(questions, args.topic));
      const ruleBlockers = ruleIssues.filter(issue => issue.blocking);

      if (ruleBlockers.length === 0) {
        console.warn(
          `[Quiz Generate] Time budget exceeded (${elapsed}ms/${VALIDATION_TIME_BUDGET_MS}ms) at round ${round} — ` +
          `deterministic checks pass, delivering quiz without AI validation.`
        );
        return shuffleQuestions(questions);
      }

      // Deterministic blockers remain and we're out of time — must fail
      console.warn(
        `[Quiz Generate] Time budget exceeded with ${ruleBlockers.length} deterministic blocker(s): ` +
        `${summarizeValidationIssues(ruleBlockers)}`
      );
      lastIssues = ruleBlockers;
      break;
    }

    // Full validation: deterministic rules + AI reviewer
    const ruleIssues = toRuleQualityIssues(validateQuizBatch(questions, args.topic));
    const aiIssues = toAIQualityIssues(await validateQuizWithAI({
      useOpenRouter: args.useOpenRouter,
      level: args.level,
      topic: args.topic,
      difficulty: args.difficulty,
      questions,
    }));
    const allIssues = [...ruleIssues, ...aiIssues];
    const issues = allIssues.filter(issue => issue.blocking);
    const warnings = allIssues.filter(issue => !issue.blocking);

    if (warnings.length > 0) {
      console.warn(`[Quiz Generate] Non-blocking AI warnings: ${summarizeValidationIssues(warnings)}`);
    }

    if (issues.length === 0) {
      const totalMs = Date.now() - startTime;
      console.log(
        `[Quiz Generate] Validated in ${round} round(s), ${totalMs}ms — ` +
        `${questions.length} questions, ${warnings.length} warning(s)`
      );
      return shuffleQuestions(questions);
    }

    lastIssues = issues;
    const failedIndexes = [...new Set(issues.map(issue => issue.questionIndex))].sort((a, b) => a - b);
    const summary = summarizeValidationIssues(issues);
    console.warn(`[Quiz Generate] Validation round ${round}/${MAX_VALIDATION_ROUNDS} failed: ${summary}`);

    if (round === MAX_VALIDATION_ROUNDS) {
      break;
    }

    // Regenerate only failed questions to preserve healthy items while fixing defects.
    const replacementCount = failedIndexes.length;
    const retryInstruction = buildQualityRetryInstruction(issues, replacementCount);
    let replacements: QuizQuestion[];

    try {
      replacements = await generateQuizBatch({
        ...args,
        count: replacementCount,
        qualityInstruction: retryInstruction,
      });
    } catch (replacementError) {
      console.warn('[Quiz Generate] Replacement generation failed, regenerating full batch once:', replacementError);
      questions = await generateQuizBatch({
        ...args,
        count: args.count,
        qualityInstruction: retryInstruction,
      });
      continue;
    }

    if (replacements.length < replacementCount) {
      console.warn(
        `[Quiz Generate] Replacement count mismatch (${replacements.length}/${replacementCount}), regenerating full batch.`
      );
      questions = await generateQuizBatch({
        ...args,
        count: args.count,
        qualityInstruction: retryInstruction,
      });
      continue;
    }

    const patchedQuestions = [...questions];
    failedIndexes.forEach((idx, replacementIdx) => {
      patchedQuestions[idx] = replacements[replacementIdx];
    });
    questions = patchedQuestions;
  }

  // Graceful degradation: if only AI-flagged issues remain (no deterministic
  // rule blockers), deliver the quiz rather than failing the entire request.
  // The AI reviewer is advisory — deterministic rules are the hard gate.
  const ruleBlockersInFinal = lastIssues.filter(issue => issue.source === 'rule');
  const aiCriticalInFinal = lastIssues.filter(issue => issue.source === 'ai' && issue.blocking);
  const aiWarningsOnly = lastIssues.filter(issue => issue.source === 'ai' && !issue.blocking);

  // Deliver if only AI warnings remain (no rule blockers and no AI critical issues)
  if (ruleBlockersInFinal.length === 0 && aiCriticalInFinal.length === 0 && lastIssues.length > 0) {
    const totalMs = Date.now() - startTime;
    console.warn(
      `[Quiz Generate] Delivering quiz with ${aiWarningsOnly.length} AI warning(s) after ` +
      `${MAX_VALIDATION_ROUNDS} rounds (${totalMs}ms) — no critical issues remain.`
    );
    return shuffleQuestions(questions);
  }

  throw new QuizContentGuardrailError(
    `Validation failed after ${MAX_VALIDATION_ROUNDS} rounds (${summarizeValidationIssues(lastIssues)})`,
    lastIssues
  );
}

/**
 * POST /api/v1/quiz/generate
 * Generate quiz questions based on parameters
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting (both anti-spam and daily quota)
    const ip = getClientIp(request);
    const rateLimitResult = await checkRateLimit(ip);

    if (!rateLimitResult.success) {
      if (rateLimitResult.quotaStatus && rateLimitResult.dailyRemaining !== undefined) {
        throw new QuotaError(rateLimitResult.quotaStatus.resetsAt);
      }
      throw new RateLimitError(rateLimitResult.retryAfter);
    }

    // Parse and validate request body
    const body = await request.json();

    // Use Zod validation
    let validatedData: QuizRequest;
    try {
      validatedData = validateQuizRequest(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ValidationError('request body', formatZodError(error).error);
      }
      throw new ValidationError('request body');
    }

    const { level, topics, difficulty, questionCount } = validatedData;
    const topic = topics[0]; // Use first topic for generation
    const requestedCount = Number(questionCount);
    const count = Math.min(requestedCount, QUIZ_QUESTION_COUNT_MAX);
    if (requestedCount > QUIZ_QUESTION_COUNT_MAX) {
      console.warn(`[Quiz Generate] Requested ${requestedCount} questions; capped to ${QUIZ_QUESTION_COUNT_MAX}`);
    }

    // Determine which AI provider to use
    const useOpenRouter = config.isOpenRouterConfigured();
    console.log(`[Quiz Generate] Provider: ${useOpenRouter ? 'OpenRouter' : 'Gemini'}, Level: ${level}, Topic: ${topic}, Count: ${count}, Difficulty: ${difficulty}`);

    // Check AI provider health (skip for OpenRouter — it has its own error handling)
    if (!useOpenRouter) {
      const health = await checkHealth();
      if (!health.available) {
        throw new AIError(
          ErrorCode.AI_UNAVAILABLE,
          health.error || 'AI service temporarily unavailable. Please try again later.'
        );
      }
    }

    // Get RAG context for style reference (if available)
    let ragContext: string | undefined;
    if (isPineconeConfigured()) {
      try {
        const ragResult = await searchByFilters(
          { gradeLevel: level as GradeLevel, topic, maxResults: 5 },
          `${level} ${topic} math question`
        );
        if (ragResult.count > 0) {
          ragContext = ragResult.formattedContext;
          console.log(`RAG context found: ${ragResult.count} examples for quiz generation`);
        }
      } catch (ragError) {
        console.warn('RAG lookup failed, proceeding without style context:', ragError);
      }
    }

    let questions: QuizQuestion[];
    try {
      questions = await generateValidatedQuiz({
        useOpenRouter,
        topic,
        level,
        count,
        difficulty,
        ragContext,
      });
    } catch (error) {
      if (error instanceof QuizContentGuardrailError) {
        console.error('[Quiz Generate] Validation gate blocked quiz output:', error.message, error.issues);
        throw new AIError(
          ErrorCode.AI_UNAVAILABLE,
          QUIZ_GENERATION_FAILURE_MESSAGE,
          true
        );
      }
      throw error;
    }

    const response = {
      questions,
      count: questions.length,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Quiz generation API error:', error);
    return errorToResponse(error);
  }
}

/**
 * GET /api/v1/quiz/generate
 * Returns 405 - Method not allowed
 */
export async function GET() {
  return errorToResponse(
    new ValidationError('method', 'Method not allowed. Use POST.')
  );
}
