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

You MUST audit each question by SOLVING IT YOURSELF. Do NOT trust the provided explanation or correctAnswer — verify independently.

## AUDIT PROCESS (Follow for EVERY question):
1. Read the question and options
2. Solve the problem yourself step by step
3. Determine which option matches YOUR answer
4. Compare YOUR answer to the stated correctAnswer
5. Check: does the explanation match YOUR solution?

## Flag as CRITICAL ("severity": "critical") if:
- Your computed answer differs from the stated correctAnswer (MATH_INCORRECT)
- The question's conditions are contradictory or impossible to satisfy (LOGIC_CONTRADICTION)
- Countable quantities (people, items, objects) result in non-integer amounts (LOGIC_CONTRADICTION)
- The stated correctAnswer does not match the explanation's conclusion (ANSWER_KEY_MISMATCH)
- More than one option is mathematically correct (MULTIPLE_CORRECT_OPTIONS)
- No option matches the correct mathematical answer (NO_CORRECT_OPTION)
- The question requires a diagram, chart, or visual that is not provided (UNSOLVABLE_TEXT_ONLY)
- The question contradicts itself (e.g., states a cost then asks to find that same cost) (LOGIC_CONTRADICTION)

## Flag as WARNING ("severity": "warning") if:
- Formatting is poor but math is correct (FORMAT_ISSUE)
- Wording is confusing but the question is technically solvable (FORMAT_ISSUE)

## Allowed reasonCodes:
LOGIC_CONTRADICTION, MATH_INCORRECT, ANSWER_KEY_MISMATCH, MULTIPLE_CORRECT_OPTIONS, NO_CORRECT_OPTION, UNSOLVABLE_TEXT_ONLY, FORMAT_ISSUE

## Output format (strict JSON only):
{
  "failedQuestions": [
    {
      "questionIndex": 0,
      "severity": "critical" | "warning",
      "reasonCodes": ["CODE_1"],
      "message": "Your computed answer is X but correctAnswer states Y",
      "regenerationHint": "Short fix guidance"
    }
  ]
}

Rules:
- questionIndex is 0-based
- Include ONLY failed questions
- If all questions pass YOUR independent verification, return {"failedQuestions": []}
- No markdown, no code fences, no extra text`;

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
      maxOutputTokens: 6000,
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
      max_tokens: 6000,
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
