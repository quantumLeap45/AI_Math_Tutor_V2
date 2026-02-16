/**
 * AI Quiz Validator
 * AI Math Tutor v2
 *
 * A secondary LLM pass that audits generated quiz batches for logical
 * consistency and solvability. It does not generate new questions.
 */

import { GoogleGenAI, Content } from '@google/genai';
import { config } from '@/config';
import { PrimaryLevel, QuizQuestion } from '@/types';

const VALIDATOR_MAX_ATTEMPTS = 2;

const VALIDATOR_SYSTEM_PROMPT = `You are an independent quiz quality auditor for Singapore Primary Math (P1-P6).

You MUST audit each question and mark only failed questions.
Do NOT rewrite questions. Do NOT generate a new quiz.

Audit rules:
1) The question must be solvable from text only.
2) The question premise must be logically valid (no impossible geometry or contradictory conditions).
3) Exactly one option should be clearly correct.
4) correctAnswer must match the actual solution and explanation.
5) Explanation should not contradict the selected answer.
6) Formatting should be student-friendly (e.g., avoid '*' when '×' is intended, avoid malformed unit text like "in² centimeters").

Allowed reasonCodes:
- LOGIC_CONTRADICTION
- MATH_INCORRECT
- ANSWER_KEY_MISMATCH
- MULTIPLE_CORRECT_OPTIONS
- NO_CORRECT_OPTION
- UNSOLVABLE_TEXT_ONLY
- FORMAT_ISSUE

Output format (strict JSON object only):
{
  "failedQuestions": [
    {
      "questionIndex": 0,
      "severity": "critical" | "warning",
      "reasonCodes": ["CODE_1", "CODE_2"],
      "message": "Short reason",
      "regenerationHint": "Short fix guidance for generator"
    }
  ]
}

Rules for output:
- questionIndex is 0-based.
- Include ONLY failed questions.
- Use severity "critical" for logic/math/solvability/answer-key failures.
- Use severity "warning" only for formatting/style polish issues.
- If all questions pass, return {"failedQuestions": []}.
- No markdown, no code fences, no extra text.`;

export interface AIValidatorIssue {
  questionIndex: number;
  reasonCodes: string[];
  severity: 'critical' | 'warning';
  message: string;
  regenerationHint: string;
}

export interface ValidateQuizWithAIArgs {
  useOpenRouter: boolean;
  level: PrimaryLevel;
  topic: string;
  difficulty: string;
  questions: QuizQuestion[];
}

function normalizeReasonCodes(input: unknown): string[] {
  if (!Array.isArray(input)) return ['AI_VALIDATION_FAILED'];
  const codes = input
    .map(code => (typeof code === 'string' ? code.trim().toUpperCase().replace(/\s+/g, '_') : ''))
    .filter(Boolean);
  return codes.length > 0 ? codes : ['AI_VALIDATION_FAILED'];
}

function cleanLLMJSON(text: string): string {
  const stripped = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

  const open = stripped.indexOf('{');
  const close = stripped.lastIndexOf('}');
  if (open >= 0 && close > open) {
    return stripped.slice(open, close + 1);
  }

  return stripped;
}

/**
 * Parses AI validator response into normalized issue list.
 */
export function parseAIValidatorResponse(rawText: string, totalQuestions: number): AIValidatorIssue[] {
  const cleaned = cleanLLMJSON(rawText);
  const parsed = JSON.parse(cleaned) as {
    failedQuestions?: Array<{
      questionIndex?: unknown;
      severity?: unknown;
      reasonCodes?: unknown;
      message?: unknown;
      regenerationHint?: unknown;
    }>;
    questions?: Array<{
      questionIndex?: unknown;
      status?: unknown;
      severity?: unknown;
      reasonCodes?: unknown;
      message?: unknown;
      regenerationHint?: unknown;
    }>;
  };

  const failedItems = Array.isArray(parsed.failedQuestions)
    ? parsed.failedQuestions
    : Array.isArray(parsed.questions)
      ? parsed.questions.filter(item => String(item.status || '').toUpperCase() === 'FAIL')
      : [];

  const issues: AIValidatorIssue[] = [];

  for (const item of failedItems) {
    const index = Number(item.questionIndex);
    if (!Number.isInteger(index) || index < 0 || index >= totalQuestions) {
      continue;
    }

    const message = typeof item.message === 'string' && item.message.trim().length > 0
      ? item.message.trim()
      : 'Failed AI quiz validation.';

    const regenerationHint = typeof item.regenerationHint === 'string' && item.regenerationHint.trim().length > 0
      ? item.regenerationHint.trim()
      : 'Regenerate this question so it is logically consistent and has one correct option.';
    const severity = String(item.severity || '').toLowerCase() === 'critical' ? 'critical' : 'warning';

    issues.push({
      questionIndex: index,
      reasonCodes: normalizeReasonCodes(item.reasonCodes),
      severity,
      message,
      regenerationHint,
    });
  }

  return issues;
}

function buildValidatorInput(args: ValidateQuizWithAIArgs): string {
  const payload = {
    metadata: {
      level: args.level,
      topic: args.topic,
      difficulty: args.difficulty,
      questionCount: args.questions.length,
    },
    questions: args.questions.map((q, index) => ({
      questionIndex: index,
      level: q.level,
      topic: q.topic,
      subtopic: q.subtopic,
      difficulty: q.difficulty,
      question: q.question,
      options: q.options,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
    })),
  };

  return `Audit this quiz batch and return strict JSON only.\n\n${JSON.stringify(payload, null, 2)}`;
}

async function runValidatorWithGemini(prompt: string): Promise<string> {
  const apiKey = config.getGemini().apiKey;
  if (!apiKey) {
    throw new Error('Gemini validator unavailable: missing GEMINI_API_KEY');
  }

  const ai = new GoogleGenAI({ apiKey });
  const model = config.getGemini().model;

  const contents: Content[] = [
    { role: 'user', parts: [{ text: prompt }] },
  ];

  const response = await ai.models.generateContent({
    model,
    contents,
    config: {
      systemInstruction: VALIDATOR_SYSTEM_PROMPT,
      temperature: 0,
      maxOutputTokens: 3000,
    },
  });

  const text = response.text || '';
  if (!text.trim()) {
    throw new Error('Gemini validator returned empty response');
  }

  return text;
}

async function runValidatorWithOpenRouter(prompt: string): Promise<string> {
  const { apiKey, model } = config.getOpenRouter();
  if (!apiKey) {
    throw new Error('OpenRouter validator unavailable: missing OPENROUTER_API_KEY');
  }

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://ai-math-tutor-v2.vercel.app',
      'X-Title': 'AI Math Tutor V2',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: VALIDATOR_SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      temperature: 0,
      max_tokens: 3000,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`OpenRouter validator error: ${response.status} ${errorData.error?.message || response.statusText}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || '';
  if (!text.trim()) {
    throw new Error('OpenRouter validator returned empty response');
  }

  return text;
}

/**
 * Executes AI validation and returns normalized failed-question issues.
 */
export async function validateQuizWithAI(args: ValidateQuizWithAIArgs): Promise<AIValidatorIssue[]> {
  const prompt = buildValidatorInput(args);
  let lastError: unknown;

  for (let attempt = 1; attempt <= VALIDATOR_MAX_ATTEMPTS; attempt++) {
    try {
      const raw = args.useOpenRouter
        ? await runValidatorWithOpenRouter(prompt)
        : await runValidatorWithGemini(prompt);

      return parseAIValidatorResponse(raw, args.questions.length);
    } catch (error) {
      lastError = error;
      console.warn(`[Quiz AI Validator] Attempt ${attempt}/${VALIDATOR_MAX_ATTEMPTS} failed:`, error);
    }
  }

  // Soft-fail validator service outages so quiz generation stays available.
  // Deterministic validation remains active.
  console.warn(`[Quiz AI Validator] Disabled for this request after failures: ${String(lastError)}`);
  return [];
}
