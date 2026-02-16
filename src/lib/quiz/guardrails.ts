/**
 * Quiz Content Guardrails
 * AI Math Tutor v2
 *
 * Identifies quiz wording that depends on visuals we do not render yet.
 * The detector is intentionally flexible: questions are allowed when the
 * visual is fully described in text and remains solvable without images.
 */

import { QuizQuestion } from '@/types';

interface VisualPattern {
  label: string;
  regex: RegExp;
  allowWhenSelfContained: boolean;
}

/**
 * Visual reference patterns.
 * - allowWhenSelfContained=true: reject only when there is no sufficient textual description.
 * - allowWhenSelfContained=false: always reject (usually malformed generated text).
 */
const VISUAL_DEPENDENCY_PATTERNS: VisualPattern[] = [
  {
    label: 'below/above visual reference',
    regex: /\b(?:figure|diagram|image|picture|chart|graph|table)\s+(?:below|above|following|given|shown)\b/i,
    allowWhenSelfContained: true,
  },
  {
    label: 'refer to visual',
    regex: /\brefer(?:ring)?\s+to\s+(?:the\s+)?(?:figure|diagram|image|picture|chart|table|(?:line|bar|pie|picture)\s+graph|graph)\b/i,
    allowWhenSelfContained: true,
  },
  {
    label: 'look at visual',
    regex: /\blook\s+at\s+(?:the\s+)?(?:figure|diagram|image|picture|chart|table|(?:line|bar|pie|picture)\s+graph|graph)\b/i,
    allowWhenSelfContained: true,
  },
  {
    label: 'as shown visual',
    regex: /\bas\s+shown\s+(?:in|on)\s+(?:the\s+)?(?:figure|diagram|image|picture|chart|table|(?:line|bar|pie|picture)\s+graph|graph)\b/i,
    allowWhenSelfContained: true,
  },
  {
    label: 'if line is drawn',
    regex: /\bif\s+[A-Z]{2,}\s+is\s+(?:drawn|extended|joined|connected)\b/i,
    allowWhenSelfContained: false,
  },
  {
    label: 'not drawn to scale',
    regex: /\bnot\s+drawn\s+to\s+scale\b/i,
    allowWhenSelfContained: false,
  },
];

// Signals that the question includes enough textual data to reconstruct a "visual" question.
const NUMERIC_CUE_REGEX = /\b\d+(?:\.\d+)?\b|\b\d+\s*\/\s*\d+\b|\b\d+(?:\.\d+)?\s*%\b|\(\s*-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?\s*\)/gi;
const QUANTITY_WORD_REGEX = /\b(?:half|halves|quarter|quarters|third|thirds|fourth|fourths|fifth|fifths)\b/gi;
const STRUCTURE_CUE_REGEX = /\b(?:rectangle|square|triangle|circle|sector|grid|point|line|line\s+segment|angle|vertex|vertices|parallel|perpendicular|shaded|unshaded|ratio|fraction|coordinates?|length|width|height|radius|diameter|pie\s+chart|bar\s+graph|line\s+graph|table|chart|graph)\b/gi;
const DESCRIPTOR_CUE_REGEX = /\b(?:where|with|given|has|have|is|are|shows?|contains?)\b/i;

/**
 * Rich issue info for observability/debugging.
 */
export interface VisualDependencyIssue {
  questionIndex: number;
  field: 'question' | 'optionA' | 'optionB' | 'optionC' | 'optionD' | 'explanation';
  label: string;
  excerpt: string;
}

function excerpt(text: string, max = 140): string {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max - 3)}...`;
}

function countMatches(regex: RegExp, text: string): number {
  const matches = text.match(regex);
  return matches ? matches.length : 0;
}

/**
 * Heuristic self-contained check for visually-worded questions.
 *
 * We allow a visual reference when the prompt includes enough textual data
 * (values + relationships) for a student to solve it without an actual image.
 */
export function isLikelySelfContainedVisualDescription(text: string): boolean {
  if (!text) return false;

  const numericCues = countMatches(NUMERIC_CUE_REGEX, text);
  const quantityWordCues = countMatches(QUANTITY_WORD_REGEX, text);
  const structureCues = countMatches(STRUCTURE_CUE_REGEX, text);
  const hasDescriptorCue = DESCRIPTOR_CUE_REGEX.test(text);

  // Strong data signal: enough explicit numbers/percentages/fractions.
  if (numericCues + quantityWordCues >= 2) return true;

  // Medium signal: at least one value + multiple structural relations.
  if (numericCues + quantityWordCues >= 1 && structureCues >= 2 && hasDescriptorCue) {
    return true;
  }

  // Textual fraction-style descriptions without explicit digits can still be solvable.
  if (quantityWordCues >= 2 && structureCues >= 1) return true;

  return false;
}

function getPatternMatches(text: string): VisualPattern[] {
  if (!text) return [];
  return VISUAL_DEPENDENCY_PATTERNS.filter(pattern => pattern.regex.test(text));
}

/**
 * Returns labels of all matched visual-dependency patterns in text.
 */
export function getVisualDependencyLabels(text: string): string[] {
  return getPatternMatches(text).map(pattern => pattern.label);
}

/**
 * True when text contains wording that requires a missing visual.
 */
export function hasVisualDependency(text: string): boolean {
  const matches = getPatternMatches(text);
  if (matches.length === 0) return false;

  // Strict patterns always block.
  if (matches.some(match => !match.allowWhenSelfContained)) {
    return true;
  }

  // Flexible patterns block only when there is not enough textual description.
  return !isLikelySelfContainedVisualDescription(text);
}

function getQuestionContext(question: QuizQuestion): string {
  return [
    question.question,
    question.options.A,
    question.options.B,
    question.options.C,
    question.options.D,
  ].join(' ');
}

/**
 * Question-level helper for callers that already have structured question data.
 */
export function isQuestionLikelySelfContained(question: QuizQuestion): boolean {
  return isLikelySelfContainedVisualDescription(getQuestionContext(question));
}

/**
 * Validate generated quiz batch for text-only solvability.
 */
export function findVisualDependencyIssues(questions: QuizQuestion[]): VisualDependencyIssue[] {
  const issues: VisualDependencyIssue[] = [];

  questions.forEach((q, index) => {
    const questionContext = getQuestionContext(q);
    const canAllowFlexibleVisualRefs = isLikelySelfContainedVisualDescription(questionContext);

    const checks: Array<{ field: VisualDependencyIssue['field']; text: string }> = [
      { field: 'question', text: q.question },
      { field: 'optionA', text: q.options.A },
      { field: 'optionB', text: q.options.B },
      { field: 'optionC', text: q.options.C },
      { field: 'optionD', text: q.options.D },
      { field: 'explanation', text: q.explanation },
    ];

    for (const check of checks) {
      const patternMatches = getPatternMatches(check.text);
      for (const match of patternMatches) {
        if (match.allowWhenSelfContained && canAllowFlexibleVisualRefs) {
          continue;
        }

        issues.push({
          questionIndex: index,
          field: check.field,
          label: match.label,
          excerpt: excerpt(check.text),
        });
      }
    }
  });

  return issues;
}
