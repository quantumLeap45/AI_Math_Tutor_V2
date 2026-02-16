/**
 * Quiz Integrity Validator
 * AI Math Tutor v2
 *
 * Performs server-side quality checks on generated quizzes before they are sent
 * to students. This is a hard gate to block inconsistent answer keys,
 * unsolvable visual references, and malformed options.
 */

import { QuizOption, QuizQuestion } from '@/types';
import { findVisualDependencyIssues } from '@/lib/quiz/guardrails';

export type QuizIntegrityIssueCode =
  | 'VISUAL_DEPENDENCY'
  | 'DUPLICATE_OPTIONS'
  | 'EXPLANATION_KEY_MISMATCH'
  | 'EXPLANATION_ANSWER_MISMATCH'
  | 'AMBIGUOUS_COMPARISON'
  | 'DETERMINISTIC_MATH_MISMATCH';

export interface QuizIntegrityIssue {
  questionIndex: number;
  code: QuizIntegrityIssueCode;
  field: 'question' | 'options' | 'correctAnswer' | 'explanation';
  message: string;
  excerpt?: string;
}

interface CheckContext {
  question: QuizQuestion;
  questionIndex: number;
}

const OPTION_KEYS: QuizOption[] = ['A', 'B', 'C', 'D'];

const DIFFERENT_DIMENSION_COMPARISON_PATTERN = /\b(?:compare|compared|comparison|larger|greater|smaller|less|equal|same)\b/i;
const NUMERIC_COMPARISON_CLARIFIER_PATTERN = /\b(?:numerical\s+value|numeric\s+value|numbers?\s+only|ignore\s+units?|compare\s+the\s+numbers?)\b/i;

function excerpt(text: string, max = 160): string {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max - 3)}...`;
}

function normalizeForCompare(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\u00b2\u00b3]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function hasDuplicateOptions(question: QuizQuestion): boolean {
  const normalizedOptions = OPTION_KEYS.map(key => normalizeForCompare(question.options[key]));
  return new Set(normalizedOptions).size !== normalizedOptions.length;
}

function parseExplicitAnswerKeyFromExplanation(explanation: string): QuizOption | null {
  const match = explanation.match(/\b(?:correct\s+answer|correct\s+option|answer|option)\s*(?:is|:)\s*([ABCD])\b/i);
  return match?.[1]?.toUpperCase() as QuizOption | null;
}

function extractAnswerPhrase(explanation: string): string | null {
  const match = explanation.match(/\banswer\s*[:\-]\s*([^\n.]{2,180})/i);
  if (!match?.[1]) return null;

  const phrase = match[1].trim();
  if (/^(?:[ABCD]|option\s*[ABCD])$/i.test(phrase)) return null;
  return phrase;
}

function inferOptionFromAnswerPhrase(phrase: string, options: QuizQuestion['options']): QuizOption | null {
  const normalizedPhrase = normalizeForCompare(phrase);
  if (normalizedPhrase.length < 4) return null;

  const matches = OPTION_KEYS.filter(key => {
    const option = normalizeForCompare(options[key]);
    return option.includes(normalizedPhrase) || normalizedPhrase.includes(option);
  });

  if (matches.length === 1) return matches[0];
  return null;
}

function hasAmbiguousCrossUnitComparison(questionText: string): boolean {
  const text = questionText.toLowerCase();

  const comparesAreaAndPerimeter = text.includes('area') && text.includes('perimeter');
  const comparesVolumeAndArea = text.includes('volume') && text.includes('area');
  const comparesVolumeAndLength = text.includes('volume') && (text.includes('length') || text.includes('perimeter'));

  const comparesDifferentDimensions = comparesAreaAndPerimeter || comparesVolumeAndArea || comparesVolumeAndLength;
  if (!comparesDifferentDimensions) return false;
  if (!DIFFERENT_DIMENSION_COMPARISON_PATTERN.test(text)) return false;

  return !NUMERIC_COMPARISON_CLARIFIER_PATTERN.test(text);
}

function parseNumericOptionValue(optionText: string): number | null {
  const trimmed = optionText.trim();

  const fractionMatch = trimmed.match(/^(-?\d+(?:\.\d+)?)\s*\/\s*(-?\d+(?:\.\d+)?)$/);
  if (fractionMatch) {
    const denominator = Number(fractionMatch[2]);
    if (denominator === 0) return null;
    return Number(fractionMatch[1]) / denominator;
  }

  const numericMatch = trimmed.match(/-?\d+(?:\.\d+)?/);
  if (!numericMatch) return null;
  return Number(numericMatch[0]);
}

function tokenizeExpression(expression: string): string[] | null {
  const tokens: string[] = [];
  const input = expression.replace(/\s+/g, '');

  let i = 0;
  while (i < input.length) {
    const char = input[i];

    if (/\d|\./.test(char)) {
      let j = i + 1;
      while (j < input.length && /[\d.]/.test(input[j])) j += 1;
      const numberToken = input.slice(i, j);
      if ((numberToken.match(/\./g) || []).length > 1) return null;
      tokens.push(numberToken);
      i = j;
      continue;
    }

    if ('+-*/()'.includes(char)) {
      tokens.push(char);
      i += 1;
      continue;
    }

    return null;
  }

  return tokens;
}

function evaluateArithmeticExpression(expression: string): number | null {
  const tokens = tokenizeExpression(expression);
  if (!tokens || tokens.length === 0) return null;

  const values: number[] = [];
  const operators: string[] = [];

  const precedence = (op: string): number => {
    if (op === '+' || op === '-') return 1;
    if (op === '*' || op === '/') return 2;
    return 0;
  };

  const applyOperator = (): boolean => {
    const op = operators.pop();
    const right = values.pop();
    const left = values.pop();

    if (!op || left === undefined || right === undefined) return false;

    switch (op) {
      case '+':
        values.push(left + right);
        return true;
      case '-':
        values.push(left - right);
        return true;
      case '*':
        values.push(left * right);
        return true;
      case '/':
        if (right === 0) return false;
        values.push(left / right);
        return true;
      default:
        return false;
    }
  };

  let previousToken: string | null = null;

  for (const token of tokens) {
    if (/^-?\d+(?:\.\d+)?$/.test(token)) {
      values.push(Number(token));
      previousToken = token;
      continue;
    }

    if (token === '(') {
      operators.push(token);
      previousToken = token;
      continue;
    }

    if (token === ')') {
      while (operators.length > 0 && operators[operators.length - 1] !== '(') {
        if (!applyOperator()) return null;
      }
      if (operators.pop() !== '(') return null;
      previousToken = token;
      continue;
    }

    // Unary minus support: convert "-x" into "0 - x"
    if (token === '-' && (previousToken === null || ['(', '+', '-', '*', '/'].includes(previousToken))) {
      values.push(0);
    }

    while (operators.length > 0 && precedence(operators[operators.length - 1]) >= precedence(token)) {
      if (!applyOperator()) return null;
    }

    operators.push(token);
    previousToken = token;
  }

  while (operators.length > 0) {
    if (operators[operators.length - 1] === '(') return null;
    if (!applyOperator()) return null;
  }

  return values.length === 1 ? values[0] : null;
}

function tryValidateExpressionQuestion(context: CheckContext): QuizIntegrityIssue | null {
  const questionText = context.question.question;
  const expressionMatch = questionText.match(/\b(?:find|what\s+is|calculate|evaluate|work\s*out)\s+(?:the\s+)?value\s+of\s+(.+?)\s+when\b/i);
  if (!expressionMatch?.[1]) return null;

  const assignments = [...questionText.matchAll(/\b([a-z])\s*=\s*(-?\d+(?:\.\d+)?)\b/gi)];
  if (assignments.length === 0) return null;

  let expression = expressionMatch[1]
    .replace(/[−–]/g, '-')
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/\s+/g, ' ')
    .trim();

  // Normalize implicit multiplication: 8c -> 8*c, 3(x+1) -> 3*(x+1)
  expression = expression
    .replace(/(\d)([a-zA-Z])/g, '$1*$2')
    .replace(/([a-zA-Z])(\d)/g, '$1*$2')
    .replace(/(\d)\(/g, '$1*(')
    .replace(/\)(\d)/g, ')*$1')
    .replace(/\)([a-zA-Z])/g, ')*$1')
    .replace(/([a-zA-Z])\(/g, '$1*(');

  for (const assignment of assignments) {
    const variable = assignment[1];
    const value = assignment[2];
    expression = expression.replace(new RegExp(`\\b${variable}\\b`, 'gi'), value);
  }

  if (/[a-z]/i.test(expression)) return null;

  // Allow only arithmetic characters after substitution.
  if (!/^[\d\s+\-*/().]+$/.test(expression)) return null;

  const expectedValue = evaluateArithmeticExpression(expression);
  if (expectedValue === null || Number.isNaN(expectedValue)) return null;

  const parsedOptions = OPTION_KEYS.map(key => ({
    key,
    value: parseNumericOptionValue(context.question.options[key]),
  }));

  if (parsedOptions.some(item => item.value === null)) return null;

  const distances = parsedOptions.map(item => ({
    key: item.key,
    diff: Math.abs((item.value as number) - expectedValue),
  }));

  distances.sort((a, b) => a.diff - b.diff);
  const best = distances[0];
  const secondBest = distances[1];

  if (!best || !secondBest) return null;
  if (best.diff > 1e-6) return null;
  if (Math.abs(best.diff - secondBest.diff) < 1e-9) return null;

  if (best.key !== context.question.correctAnswer) {
    return {
      questionIndex: context.questionIndex,
      code: 'DETERMINISTIC_MATH_MISMATCH',
      field: 'correctAnswer',
      message: `Computed value is ${expectedValue}, but correctAnswer is ${context.question.correctAnswer}.`,
      excerpt: excerpt(questionText),
    };
  }

  return null;
}

function evaluateAreaPerimeterOptionTruth(optionText: string, area: number, perimeter: number): boolean | null {
  const text = normalizeForCompare(optionText);
  if (!text.includes('area') || !text.includes('perimeter')) return null;

  const areaBeforePerimeter = /area.*perimeter/.test(text);
  const perimeterBeforeArea = /perimeter.*area/.test(text);

  if (text.includes('equal') || text.includes('same')) {
    return Math.abs(area - perimeter) < 1e-9;
  }

  if (text.includes('twice')) {
    if (/perimeter.*twice.*area/.test(text)) return Math.abs(perimeter - 2 * area) < 1e-9;
    if (/area.*twice.*perimeter/.test(text)) return Math.abs(area - 2 * perimeter) < 1e-9;
  }

  const hasLarger = /(larger|greater|more|bigger)/.test(text);
  const hasSmaller = /(smaller|less|lower)/.test(text);

  if (hasLarger) {
    if (areaBeforePerimeter) return area > perimeter;
    if (perimeterBeforeArea) return perimeter > area;
  }

  if (hasSmaller) {
    if (areaBeforePerimeter) return area < perimeter;
    if (perimeterBeforeArea) return perimeter < area;
  }

  return null;
}

function inferExpectedAreaPerimeterAnswer(question: QuizQuestion): QuizOption | null {
  const text = question.question.toLowerCase();

  if (!(text.includes('area') && text.includes('perimeter'))) return null;
  if (!DIFFERENT_DIMENSION_COMPARISON_PATTERN.test(text)) return null;

  // Square case
  const squareMatch = text.match(/square\s+has\s+(?:a\s+)?side\s+length\s+of\s*(-?\d+(?:\.\d+)?)/i);
  if (squareMatch?.[1]) {
    const side = Number(squareMatch[1]);
    if (!Number.isFinite(side)) return null;

    const area = side * side;
    const perimeter = 4 * side;

    const trueOptions = OPTION_KEYS.filter(key => evaluateAreaPerimeterOptionTruth(question.options[key], area, perimeter) === true);
    return trueOptions.length === 1 ? trueOptions[0] : null;
  }

  // Rectangle case
  const rectMatch = text.match(/length\s*(?:is|=|of)?\s*(-?\d+(?:\.\d+)?)[^\d]{0,25}width\s*(?:is|=|of)?\s*(-?\d+(?:\.\d+)?)/i)
    || text.match(/width\s*(?:is|=|of)?\s*(-?\d+(?:\.\d+)?)[^\d]{0,25}length\s*(?:is|=|of)?\s*(-?\d+(?:\.\d+)?)/i);

  if (!rectMatch?.[1] || !rectMatch?.[2]) return null;

  const a = Number(rectMatch[1]);
  const b = Number(rectMatch[2]);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;

  const area = a * b;
  const perimeter = 2 * (a + b);

  const trueOptions = OPTION_KEYS.filter(key => evaluateAreaPerimeterOptionTruth(question.options[key], area, perimeter) === true);
  return trueOptions.length === 1 ? trueOptions[0] : null;
}

function tryValidateAreaPerimeterComparison(context: CheckContext): QuizIntegrityIssue | null {
  const expected = inferExpectedAreaPerimeterAnswer(context.question);
  if (!expected) return null;

  if (expected !== context.question.correctAnswer) {
    return {
      questionIndex: context.questionIndex,
      code: 'DETERMINISTIC_MATH_MISMATCH',
      field: 'correctAnswer',
      message: `Area/perimeter comparison implies ${expected}, but correctAnswer is ${context.question.correctAnswer}.`,
      excerpt: excerpt(context.question.question),
    };
  }

  return null;
}

function validateQuestion(question: QuizQuestion, questionIndex: number): QuizIntegrityIssue[] {
  const issues: QuizIntegrityIssue[] = [];
  const context: CheckContext = { question, questionIndex };

  if (hasDuplicateOptions(question)) {
    issues.push({
      questionIndex,
      code: 'DUPLICATE_OPTIONS',
      field: 'options',
      message: 'Options contain duplicate or near-identical values.',
      excerpt: `${question.options.A} | ${question.options.B} | ${question.options.C} | ${question.options.D}`,
    });
  }

  const explicitAnswer = parseExplicitAnswerKeyFromExplanation(question.explanation);
  if (explicitAnswer && explicitAnswer !== question.correctAnswer) {
    issues.push({
      questionIndex,
      code: 'EXPLANATION_KEY_MISMATCH',
      field: 'explanation',
      message: `Explanation states option ${explicitAnswer}, but correctAnswer is ${question.correctAnswer}.`,
      excerpt: excerpt(question.explanation),
    });
  }

  const answerPhrase = extractAnswerPhrase(question.explanation);
  if (answerPhrase) {
    const inferredOption = inferOptionFromAnswerPhrase(answerPhrase, question.options);
    if (inferredOption && inferredOption !== question.correctAnswer) {
      issues.push({
        questionIndex,
        code: 'EXPLANATION_ANSWER_MISMATCH',
        field: 'explanation',
        message: `Explanation answer text maps to option ${inferredOption}, but correctAnswer is ${question.correctAnswer}.`,
        excerpt: excerpt(question.explanation),
      });
    }
  }

  if (hasAmbiguousCrossUnitComparison(question.question)) {
    issues.push({
      questionIndex,
      code: 'AMBIGUOUS_COMPARISON',
      field: 'question',
      message: 'Question compares different units (e.g., area vs perimeter) without clarifying numerical comparison.',
      excerpt: excerpt(question.question),
    });
  }

  const expressionIssue = tryValidateExpressionQuestion(context);
  if (expressionIssue) issues.push(expressionIssue);

  const areaPerimeterIssue = tryValidateAreaPerimeterComparison(context);
  if (areaPerimeterIssue) issues.push(areaPerimeterIssue);

  return issues;
}

/**
 * Validate a generated quiz batch.
 */
export function validateQuizBatch(questions: QuizQuestion[]): QuizIntegrityIssue[] {
  const issues: QuizIntegrityIssue[] = [];

  const visualIssues = findVisualDependencyIssues(questions);
  for (const issue of visualIssues) {
    issues.push({
      questionIndex: issue.questionIndex,
      code: 'VISUAL_DEPENDENCY',
      field: issue.field === 'question' ? 'question' : issue.field === 'explanation' ? 'explanation' : 'options',
      message: `${issue.label}: visual reference is not safely self-contained.`,
      excerpt: issue.excerpt,
    });
  }

  questions.forEach((question, index) => {
    issues.push(...validateQuestion(question, index));
  });

  return issues;
}

/**
 * Utility for retry orchestration: unique indexes that failed validation.
 */
export function getFailingQuestionIndexes(issues: QuizIntegrityIssue[]): number[] {
  return [...new Set(issues.map(issue => issue.questionIndex))].sort((a, b) => a - b);
}
