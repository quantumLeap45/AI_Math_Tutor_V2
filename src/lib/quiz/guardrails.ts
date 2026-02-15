/**
 * Quiz Content Guardrails
 * AI Math Tutor v2
 *
 * Blocks quiz content that depends on visuals we do not render yet.
 * This prevents unsolvable prompts like "refer to the figure below".
 */

import { QuizQuestion } from '@/types';

/**
 * Regex patterns that indicate visual-dependent wording.
 * Keep patterns specific to avoid blocking normal word problems.
 */
const VISUAL_DEPENDENCY_PATTERNS: Array<{ label: string; regex: RegExp }> = [
  { label: 'below/above visual reference', regex: /\b(?:figure|diagram|image|picture|chart|graph|table)\s+(?:below|above)\b/i },
  { label: 'refer to visual', regex: /\brefer(?:ring)?\s+to\s+(?:the\s+)?(?:figure|diagram|image|picture|chart|table|(?:line|bar|pie|picture)\s+graph|graph)\b/i },
  { label: 'look at visual', regex: /\blook\s+at\s+(?:the\s+)?(?:figure|diagram|image|picture|chart|table|(?:line|bar|pie|picture)\s+graph|graph)\b/i },
  { label: 'as shown visual', regex: /\bas\s+shown\s+(?:in|on)\s+(?:the\s+)?(?:figure|diagram|image|picture|chart|table|(?:line|bar|pie|picture)\s+graph|graph)\b/i },
  // We intentionally allow descriptive text like:
  // "In the pie chart, 25% are girls, 45% are boys..."
  // as long as it does not depend on a missing "below/above" visual reference.
  { label: 'if line is drawn', regex: /\bif\s+[A-Z]{2,}\s+is\s+(?:drawn|extended|joined|connected)\b/i },
  { label: 'not drawn to scale', regex: /\bnot\s+drawn\s+to\s+scale\b/i },
];

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

/**
 * Returns labels of all matched visual-dependency patterns in text.
 */
export function getVisualDependencyLabels(text: string): string[] {
  if (!text) return [];

  const matches: string[] = [];
  for (const pattern of VISUAL_DEPENDENCY_PATTERNS) {
    if (pattern.regex.test(text)) {
      matches.push(pattern.label);
    }
  }
  return matches;
}

/**
 * True when text contains wording that requires a missing visual.
 */
export function hasVisualDependency(text: string): boolean {
  return getVisualDependencyLabels(text).length > 0;
}

/**
 * Validate generated quiz batch for text-only solvability.
 */
export function findVisualDependencyIssues(questions: QuizQuestion[]): VisualDependencyIssue[] {
  const issues: VisualDependencyIssue[] = [];

  questions.forEach((q, index) => {
    const checks: Array<{ field: VisualDependencyIssue['field']; text: string }> = [
      { field: 'question', text: q.question },
      { field: 'optionA', text: q.options.A },
      { field: 'optionB', text: q.options.B },
      { field: 'optionC', text: q.options.C },
      { field: 'optionD', text: q.options.D },
      { field: 'explanation', text: q.explanation },
    ];

    for (const check of checks) {
      const labels = getVisualDependencyLabels(check.text);
      for (const label of labels) {
        issues.push({
          questionIndex: index,
          field: check.field,
          label,
          excerpt: excerpt(check.text),
        });
      }
    }
  });

  return issues;
}
