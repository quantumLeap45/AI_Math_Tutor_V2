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
  | 'DETERMINISTIC_MATH_MISMATCH'
  | 'GEOMETRY_LOGIC_INVALID'
  | 'NON_INTEGER_COUNTABLE'
  | 'INVALID_CURRENCY'
  | 'TOPIC_DRIFT'
  | 'DIFFICULTY_MISLABEL';

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
  requestedTopic?: string;
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

function extractAngleValues(text: string): number[] {
  return [...text.matchAll(/(-?\d+(?:\.\d+)?)\s*(?:°|degrees?)/gi)]
    .map(match => Number(match[1]))
    .filter(value => Number.isFinite(value));
}

function tryValidateAngleShapeQuestion(context: CheckContext): QuizIntegrityIssue | null {
  const questionText = context.question.question;
  const angleValues = extractAngleValues(questionText);

  const mentionsThreeAngles = /\b(?:three|3)\s+angles?\b/i.test(questionText);
  const mentionsTriangle = /\btriangle\b/i.test(questionText);
  const mentionsQuadrilateral = /\bquadrilateral\b/i.test(questionText);
  const asksShapeType = mentionsTriangle && mentionsQuadrilateral;

  if (!mentionsThreeAngles && !asksShapeType) return null;
  if (angleValues.length < 3) return null;

  const sum = angleValues.slice(0, 3).reduce((total, value) => total + value, 0);
  const isTriangleValid = Math.abs(sum - 180) < 1e-6;
  const isQuadrilateralValid = Math.abs(sum - 360) < 1e-6;

  if (mentionsThreeAngles && !isTriangleValid) {
    return {
      questionIndex: context.questionIndex,
      code: 'GEOMETRY_LOGIC_INVALID',
      field: 'question',
      message: `Question states three angles but their sum is ${sum}, not 180.`,
      excerpt: excerpt(questionText),
    };
  }

  if (!asksShapeType) return null;
  if (!isTriangleValid && !isQuadrilateralValid) {
    return {
      questionIndex: context.questionIndex,
      code: 'GEOMETRY_LOGIC_INVALID',
      field: 'question',
      message: `Angle sum ${sum} does not support triangle (180) or quadrilateral (360).`,
      excerpt: excerpt(questionText),
    };
  }

  // If options encode "<sum>; <shape>", verify correctAnswer against deterministic expectation.
  const expectedShape = isTriangleValid ? 'triangle' : 'quadrilateral';
  const matches = OPTION_KEYS.filter(key => {
    const option = normalizeForCompare(context.question.options[key]);
    const hasShape = option.includes(expectedShape);
    const numeric = parseNumericOptionValue(context.question.options[key]);
    return hasShape && numeric !== null && Math.abs(numeric - sum) < 1e-6;
  });

  if (matches.length === 1 && matches[0] !== context.question.correctAnswer) {
    return {
      questionIndex: context.questionIndex,
      code: 'DETERMINISTIC_MATH_MISMATCH',
      field: 'correctAnswer',
      message: `Angle-shape logic implies ${matches[0]}, but correctAnswer is ${context.question.correctAnswer}.`,
      excerpt: excerpt(questionText),
    };
  }

  return null;
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

// --- Phase 6: New deterministic checks ---

/** Countable nouns that must always be whole numbers */
const COUNTABLE_NOUNS = /\b(?:people|person|children|child|students?|boys?|girls?|men|women|erasers?|pencils?|pens?|books?|marbles?|stickers?|sweets?|candies?|apples?|oranges?|mangoes?|balls?|coins?|stamps?|cards?|bags?|boxes?|bottles?|cups?|plates?|slices?|pieces?|packets?|bundles?|crayons?|rulers?|notebooks?|shirts?|beads?|toys?|cars?|buses?|flowers?|eggs?|cakes?|cookies?|muffins?|sandwiches?)\b/i;

function checkNonIntegerCountable(context: CheckContext): QuizIntegrityIssue | null {
  const { question } = context;
  const text = question.question.toLowerCase();

  // Only check if the question mentions countable items
  if (!COUNTABLE_NOUNS.test(text)) return null;

  // Check the correct answer option value
  const correctOptionText = question.options[question.correctAnswer as QuizOption];
  const numericMatch = correctOptionText.match(/^[\s$SGD]*(-?\d+(?:\.\d+)?)[\s%]*/);
  if (!numericMatch) return null;

  const value = Number(numericMatch[1]);
  if (!Number.isFinite(value)) return null;

  // If the answer is a non-integer and the question is about countable items, flag it
  if (!Number.isInteger(value)) {
    return {
      questionIndex: context.questionIndex,
      code: 'NON_INTEGER_COUNTABLE',
      field: 'correctAnswer',
      message: `Correct answer is ${value} but the question involves countable items that must be whole numbers.`,
      excerpt: excerpt(question.question),
    };
  }

  return null;
}

function checkInvalidCurrency(context: CheckContext): QuizIntegrityIssue | null {
  const { question } = context;
  const text = question.question.toLowerCase();

  // Only check if the question involves money
  if (!/[$]|sgd|\bdollars?\b|\bcents?\b|\bmoney\b/i.test(text)) return null;

  // Check all option values for invalid currency amounts (>2 decimal places)
  for (const key of OPTION_KEYS) {
    const optionText = question.options[key];
    const moneyMatches = [...optionText.matchAll(/\$(\d+\.\d{3,})/g)];
    for (const match of moneyMatches) {
      return {
        questionIndex: context.questionIndex,
        code: 'INVALID_CURRENCY',
        field: 'options',
        message: `Option ${key} has invalid currency amount $${match[1]} (more than 2 decimal places).`,
        excerpt: `${key}: ${optionText}`,
      };
    }
  }

  return null;
}

/** Common math topics for fuzzy matching */
const TOPIC_ALIASES: Record<string, string[]> = {
  'geometry': ['geometry', 'angles', 'shapes', 'area', 'perimeter', 'volume', 'lines', 'symmetry'],
  'fractions': ['fractions', 'fraction'],
  'decimals': ['decimals', 'decimal'],
  'percentage': ['percentage', 'percent', '%'],
  'ratio': ['ratio', 'ratios', 'proportion'],
  'algebra': ['algebra', 'algebraic', 'equation', 'equations', 'variable'],
  'whole numbers': ['whole numbers', 'addition', 'subtraction', 'multiplication', 'division', 'number'],
  'money': ['money', 'dollars', 'cents', 'sgd', 'currency', 'cost', 'price'],
  'measurement': ['measurement', 'length', 'mass', 'weight', 'capacity', 'volume'],
  'time': ['time', 'clock', 'hours', 'minutes', 'duration'],
  'data analysis': ['data analysis', 'statistics', 'graph', 'graphs', 'chart', 'charts', 'table', 'tables', 'average', 'mean'],
  'speed': ['speed', 'rate', 'distance', 'velocity'],
  'patterns': ['patterns', 'pattern', 'sequences', 'sequence'],
};

function getTopicFamily(topic: string): string[] {
  const lower = topic.toLowerCase().trim();
  for (const [, aliases] of Object.entries(TOPIC_ALIASES)) {
    if (aliases.some(alias => lower.includes(alias) || alias.includes(lower))) {
      return aliases;
    }
  }
  return [lower];
}

function checkTopicDrift(context: CheckContext): QuizIntegrityIssue | null {
  const { question, requestedTopic } = context;
  if (!requestedTopic) return null;

  // Skip if topic is generic
  const genericTopics = ['math', 'maths', 'mathematics', 'mixed', 'all', 'general'];
  if (genericTopics.includes(requestedTopic.toLowerCase().trim())) return null;

  const requestedFamily = getTopicFamily(requestedTopic);
  const questionFamily = getTopicFamily(question.topic);

  // Check if there's any overlap between topic families
  const hasOverlap = requestedFamily.some(r => questionFamily.some(q => r === q));
  if (hasOverlap) return null;

  return {
    questionIndex: context.questionIndex,
    code: 'TOPIC_DRIFT',
    field: 'question',
    message: `Question topic "${question.topic}" does not match requested topic "${requestedTopic}".`,
    excerpt: excerpt(question.question),
  };
}

// --- Phase 7: Difficulty mislabel check ---

/** Patterns that indicate a raw/direct calculation (NOT a word problem) */
const RAW_EQUATION_PATTERNS = [
  /^(?:find|what is|calculate|evaluate|solve|simplify|work out)\s+(?:the\s+)?(?:value\s+of\s+)?[\d\w\s+\-*/()=×÷.^]+$/i,
  /^[\d\w\s+\-*/()=×÷.^]+\s*=\s*\?\s*$/i,
  /^(?:find|what is|calculate|evaluate|solve)\s+\d/i,
];

function checkDifficultyMislabel(context: CheckContext): QuizIntegrityIssue | null {
  const { question } = context;

  // Only check questions labeled "hard"
  if (question.difficulty !== 'hard') return null;

  const level = question.level;
  const text = question.question;

  // For P5-P6 "hard" questions: must be a word problem, not a raw equation
  if (level === 'P5' || level === 'P6') {
    // Check if question has any story/context indicators (names, scenarios)
    const hasStoryContext = /\b(?:Ahmad|Siti|Mei|Ravi|Wei|Muthu|John|Sarah|Mr|Mrs|shop|store|school|garden|park|tank|pool|journey|trip|race|train|car|bus|tap|pipe|worker)\b/i.test(text);
    const hasWordProblemStructure = text.length > 80 && /\b(?:how many|how much|what|find the|what fraction|what percentage|what is the)\b/i.test(text);

    // If it matches raw equation patterns and lacks story context, flag it
    const isRawEquation = RAW_EQUATION_PATTERNS.some(p => p.test(text.trim()));
    if (isRawEquation && !hasStoryContext) {
      return {
        questionIndex: context.questionIndex,
        code: 'DIFFICULTY_MISLABEL',
        field: 'question',
        message: `P5/P6 "hard" question appears to be a direct calculation without word problem context.`,
        excerpt: excerpt(text),
      };
    }

    // Very short questions are unlikely to be genuinely "hard" for P5/P6
    if (text.length < 60 && !hasStoryContext) {
      return {
        questionIndex: context.questionIndex,
        code: 'DIFFICULTY_MISLABEL',
        field: 'question',
        message: `P5/P6 "hard" question is too short (${text.length} chars) to be a genuine heuristic word problem.`,
        excerpt: excerpt(text),
      };
    }
  }

  // For P3-P4 "hard": should have multi-step context, not single direct operation
  if (level === 'P3' || level === 'P4') {
    const isRawEquation = RAW_EQUATION_PATTERNS.some(p => p.test(text.trim()));
    if (isRawEquation && text.length < 50) {
      return {
        questionIndex: context.questionIndex,
        code: 'DIFFICULTY_MISLABEL',
        field: 'question',
        message: `P3/P4 "hard" question appears to be a simple direct calculation.`,
        excerpt: excerpt(text),
      };
    }
  }

  return null;
}

function validateQuestion(question: QuizQuestion, questionIndex: number, requestedTopic?: string): QuizIntegrityIssue[] {
  const issues: QuizIntegrityIssue[] = [];
  const context: CheckContext = { question, questionIndex, requestedTopic };

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

  const angleShapeIssue = tryValidateAngleShapeQuestion(context);
  if (angleShapeIssue) issues.push(angleShapeIssue);

  const countableIssue = checkNonIntegerCountable(context);
  if (countableIssue) issues.push(countableIssue);

  const currencyIssue = checkInvalidCurrency(context);
  if (currencyIssue) issues.push(currencyIssue);

  const topicDriftIssue = checkTopicDrift(context);
  if (topicDriftIssue) issues.push(topicDriftIssue);

  const difficultyIssue = checkDifficultyMislabel(context);
  if (difficultyIssue) issues.push(difficultyIssue);

  return issues;
}

/**
 * Validate a generated quiz batch.
 * @param requestedTopic - The topic the user originally requested (for topic drift detection)
 */
export function validateQuizBatch(questions: QuizQuestion[], requestedTopic?: string): QuizIntegrityIssue[] {
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
    issues.push(...validateQuestion(question, index, requestedTopic));
  });

  return issues;
}

/**
 * Utility for retry orchestration: unique indexes that failed validation.
 */
export function getFailingQuestionIndexes(issues: QuizIntegrityIssue[]): number[] {
  return [...new Set(issues.map(issue => issue.questionIndex))].sort((a, b) => a - b);
}
