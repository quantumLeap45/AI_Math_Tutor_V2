/**
 * Quiz Generation API Route
 * AI Math Tutor v2
 *
 * Generates MCQ quiz questions using Gemini + RAG.
 * Questions are created fresh each time based on user's topic request.
 */

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Content } from '@google/genai';
import { getRAGContext } from '@/lib/rag/search';
import { isPineconeConfigured } from '@/lib/rag/pinecone';
import { checkHealth } from '@/lib/gemini';
import { QuizQuestion, PrimaryLevel, QuizOption } from '@/types';

export const runtime = 'nodejs';

interface GenerateQuizRequest {
  /** Topic for quiz questions */
  topic: string;
  /** Grade level (P1-P6) */
  level?: PrimaryLevel;
  /** Number of questions to generate */
  questionCount: 5 | 10 | 15 | 20;
  /** Difficulty level */
  difficulty?: 'easy' | 'medium' | 'hard' | 'all';
}

interface GenerateQuizResponse {
  /** Generated questions */
  questions: QuizQuestion[];
  /** Number of questions generated */
  count: number;
}

// Model configuration
const MODEL_NAME = 'gemini-2.5-flash';

// Quiz generation system prompt
const QUIZ_GENERATION_PROMPT = `You are an expert Singapore Primary Math question writer. Your task is to create ORIGINAL multiple-choice questions in the MOE style.

## CRITICAL RULES:
1. Create ORIGINAL questions - DO NOT copy from examples
2. Use different names, numbers, and scenarios than examples
3. Follow the same STRUCTURE and DIFFICULTY level as examples
4. Each question must have 4 options (A, B, C, D)
5. Only ONE option can be correct
6. Include a clear explanation for the correct answer

## Output Format:
Return a JSON array of questions. Each question must have:
{
  "id": "Generated-<level>-<topic>-<number>",
  "level": "P1" | "P2" | "P3" | "P4" | "P5" | "P6",
  "topic": "<topic name>",
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
- Refer to local places where appropriate (e.g., "took the MRT", "went to Sentosa")`;

/**
 * Parse quiz questions from AI response
 */
function parseQuizQuestions(response: string, expectedCount: number, level: PrimaryLevel, topic: string): QuizQuestion[] {
  try {
    // Try to extract JSON array from response
    const jsonMatch = response.match(/\[[\s\S]*\]/);
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
      };
    });

    if (questions.length === 0) {
      throw new Error('No valid questions generated');
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
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  // Initialize the Gemini client (matching existing lib/gemini.ts pattern)
  const ai = new GoogleGenAI({ apiKey });

  // Build the prompt
  const difficultyPrompt = difficulty === 'all'
    ? 'a mix of easy, medium, and hard'
    : difficulty;

  const userPrompt = ragContext
    ? `${ragContext}\n\nBased on the style examples above, please generate ${count} ${difficultyPrompt} multiple-choice questions for ${level} students on the topic of "${topic}".`
    : `Please generate ${count} ${difficultyPrompt} multiple-choice questions for ${level} students on the topic of "${topic}".`;

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
        maxOutputTokens: 4000,
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

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body: GenerateQuizRequest = await request.json();
    const { topic, level = 'P2', questionCount = 5, difficulty = 'all' } = body;

    // Validate inputs
    if (!topic || typeof topic !== 'string') {
      return NextResponse.json(
        { error: 'Topic is required and must be a string' },
        { status: 400 }
      );
    }

    if (!['P1', 'P2', 'P3', 'P4', 'P5', 'P6'].includes(level)) {
      return NextResponse.json(
        { error: 'Level must be one of: P1, P2, P3, P4, P5, P6' },
        { status: 400 }
      );
    }

    if (![5, 10, 15, 20].includes(questionCount)) {
      return NextResponse.json(
        { error: 'Question count must be one of: 5, 10, 15, 20' },
        { status: 400 }
      );
    }

    // Check Gemini health first
    const health = await checkHealth();
    if (!health.available) {
      return NextResponse.json(
        { error: health.error || 'AI service temporarily unavailable. Please try again later.' },
        { status: 503 }
      );
    }

    // Get RAG context for style reference (if available)
    let ragContext: string | undefined;
    if (isPineconeConfigured()) {
      try {
        const ragResult = await getRAGContext(`generate ${questionCount} questions for ${level} ${topic}`);
        if (ragResult.count > 0) {
          ragContext = ragResult.formattedContext;
          console.log(`RAG context found: ${ragResult.count} examples for quiz generation`);
        }
      } catch (ragError) {
        console.warn('RAG lookup failed, proceeding without style context:', ragError);
      }
    }

    // Generate quiz questions
    const questions = await generateQuizWithGemini(topic, level, questionCount, difficulty, ragContext);

    const response: GenerateQuizResponse = {
      questions,
      count: questions.length,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Quiz generation API error:', error);

    const errorMessage = error instanceof Error
      ? error.message
      : 'Failed to generate quiz questions';

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

// Handle unsupported methods
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST.' },
    { status: 405 }
  );
}
