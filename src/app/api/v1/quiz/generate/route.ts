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
import { getRAGContext } from '@/lib/rag/search';
import { isPineconeConfigured } from '@/lib/rag/pinecone';
import { checkHealth } from '@/lib/gemini';
import { QuizQuestion, PrimaryLevel, QuizOption } from '@/types';
import { config } from '@/config';
import {
  validateQuizRequest,
  QuizRequest,
  formatZodError,
} from '@/lib/validation';
import {
  errorToResponse,
  ValidationError,
  AIError,
  ErrorCode,
} from '@/lib/errors';
import { z } from 'zod';

export const runtime = 'nodejs';

// Model configuration from config
const MODEL_NAME = config.getGemini().model;

// Quiz generation system prompt
const QUIZ_GENERATION_PROMPT = `You are an expert Singapore Primary Math question writer. Your task is to create ORIGINAL multiple-choice questions in the MOE style.

## CRITICAL RULES:
1. Create ORIGINAL questions - DO NOT copy from examples
2. Use different names, numbers, and scenarios than examples
3. Follow the same STRUCTURE and DIFFICULTY level as examples
4. Each question must have 4 options (A, B, C, D)
5. Only ONE option can be correct
6. Include a clear explanation for the correct answer

## CRITICAL: VERIFY YOUR MATH
- Before finalizing each question, solve it yourself
- The correct answer option MUST match your solution
- The explanation MUST show working that arrives at the correct answer
- If the numbers don't work out, change them until they do
- NEVER create a question where the stated correct answer is wrong

## VARIETY REQUIREMENTS
- Mix question formats: word problems, direct calculation, comparison, "which is greater", ordering, fill-in-the-blank
- Use different scenario types: food sharing, shopping, travel distance, classroom items, sports scores, garden planting, cooking, crafts
- Vary the position of the correct answer across A, B, C, D (don't always put it in A or B)
- Don't repeat the same name or scenario in multiple questions
- Vary sentence structure — don't start every question the same way

## DIFFICULTY GUIDE (for Primary school students aged 6-12)
- Easy: Single-step problems, small numbers, straightforward operations
- Medium: Two-step problems, moderate numbers, may require carrying/borrowing or simple conversion
- Hard: Multi-step problems, larger numbers, requires combining multiple concepts, careful reading needed

## TOPIC HANDLING
- If the topic is "math" or very generic, create a DIVERSE mix of questions covering different topics appropriate for the given level
- For P1-P2: Whole Numbers, Addition, Subtraction, Shapes, Patterns, Money, Length, Mass
- For P3-P4: Fractions, Multiplication, Division, Area, Perimeter, Time, Graphs, Angles
- For P5-P6: Decimals, Percentage, Ratio, Rate, Volume, Algebra, Geometry, Data Analysis
- Always set the "topic" field to the actual mathematical topic of each question (e.g., "Fractions", "Geometry"), NOT the user's raw input

## Output Format:
Return a JSON array of questions. Each question must have:
{
  "id": "Generated-<level>-<topic>-<number>",
  "level": "P1" | "P2" | "P3" | "P4" | "P5" | "P6",
  "topic": "<actual math topic name, e.g. Fractions, Geometry, Whole Numbers>",
  "subtopic": "<specific subtopic>",
  "difficulty": "easy" | "medium" | "hard",
  "question": "<question text>",
  "options": {
    "A": "<option A text>",
    "B": "<option B text>",
    "C": "<option C text>",
    "D": "<option D text>"
  },
  "correctAnswer": "A" | "B" | "C" | "D",
  "explanation": "<step-by-step explanation>"
}

## Singapore Context:
- Use SGD currency for money problems
- Use Singaporean names (Ahmad, Siti, Mei Ling, Ravi, Wei Ling, Muthu, John, Sarah)
- Refer to local places where appropriate (e.g., "took the MRT", "went to Sentosa")

## IMPORTANT FORMAT RULES:
- Do NOT use LaTeX notation (no $, \\frac, \\text etc). Write fractions as "1/4" or "three-quarters"
- Write all math in plain text that a primary school student can read
- Keep explanations concise (2-3 sentences max)
- Return ONLY the JSON array — no markdown code fences, no extra text`;

/**
 * Parse quiz questions from AI response
 */
function parseQuizQuestions(response: string, expectedCount: number, level: PrimaryLevel, topic: string): QuizQuestion[] {
  try {
    // Strip markdown code fences if present
    let cleaned = response.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

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
    const questions: QuizQuestion[] = parsed.map((q: any, index: number) => {
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
        level: q.level || level,
        topic: q.topic || topic,
        subtopic: q.subtopic || topic,
        difficulty: q.difficulty || 'medium',
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
    if (questions.length > expectedCount) {
      return questions.slice(0, expectedCount);
    }

    return questions;
  } catch (error) {
    console.error('Failed to parse quiz questions:', error);
    throw new Error(`Failed to parse quiz questions: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate quiz questions using AI
 */
async function generateQuizWithGemini(
  topic: string,
  level: PrimaryLevel,
  count: number,
  difficulty: string,
  ragContext?: string
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

  const contents: Content[] = [
    { role: 'user', parts: [{ text: QUIZ_GENERATION_PROMPT + '\n\n' + userPrompt }] },
  ];

  try {
    // Use the same API pattern as lib/gemini.ts
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents,
      config: {
        systemInstruction: QUIZ_GENERATION_PROMPT,
        temperature: 0.8,
        maxOutputTokens: 8000,
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
  ragContext?: string
): Promise<QuizQuestion[]> {
  const { apiKey, model } = config.getOpenRouter();

  const difficultyPrompt = difficulty === 'all'
    ? 'a mix of easy, medium, and hard'
    : difficulty;

  const userPrompt = ragContext
    ? `${ragContext}\n\nBased on the style examples above, generate EXACTLY ${count} ${difficultyPrompt} multiple-choice questions for ${level} students on the topic of "${topic}". Not more, not less — exactly ${count} questions.`
    : `Generate EXACTLY ${count} ${difficultyPrompt} multiple-choice questions for ${level} students on the topic of "${topic}". Not more, not less — exactly ${count} questions.`;

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
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.8,
        max_tokens: 8000,
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

/**
 * POST /api/v1/quiz/generate
 * Generate quiz questions based on parameters
 */
export async function POST(request: NextRequest) {
  try {
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
    const count = Number(questionCount); // Convert literal type to number

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
        const ragResult = await getRAGContext(`generate ${count} questions for ${level} ${topic}`);
        if (ragResult.count > 0) {
          ragContext = ragResult.formattedContext;
          console.log(`RAG context found: ${ragResult.count} examples for quiz generation`);
        }
      } catch (ragError) {
        console.warn('RAG lookup failed, proceeding without style context:', ragError);
      }
    }

    // Generate quiz questions — prefer OpenRouter when configured
    const questions = useOpenRouter
      ? await generateQuizWithOpenRouter(topic, level, count, difficulty, ragContext)
      : await generateQuizWithGemini(topic, level, count, difficulty, ragContext);

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
