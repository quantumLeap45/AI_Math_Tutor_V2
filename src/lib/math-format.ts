/**
 * Math Format Utilities
 * AI Math Tutor v2
 *
 * Converts LaTeX math notation to kid-friendly plain text format
 * for display in quiz questions and options.
 */

/**
 * Converts LaTeX math notation to kid-friendly plain text.
 *
 * Handles:
 * - Fractions: $\frac{a}{b}$ or $\\frac{a}{b}$ → a/b
 * - Multiplication: \times → ×
 * - Dollar signs: $...$ → (removed)
 * - Division: \div → ÷
 * - Subscripts/Superscripts: x^2 → x², x_1 → x₁
 *
 * @param text - Text containing LaTeX notation
 * @returns Plain text with kid-friendly math notation
 */
export function formatLatexToKidFriendly(text: string): string {
  if (!text) return '';

  let result = text;

  // Remove display math delimiters $$...$$
  result = result.replace(/\$\$([^$]+)\$\$/g, '$1');

  // Remove inline math delimiters $...$
  result = result.replace(/\$([^$]+)\$/g, '$1');

  // Handle escaped dollar signs
  result = result.replace(/\\\$/g, '$');

  // Convert fractions \frac{a}{b} or \\frac{a}{b} to a/b
  // Using simple format (1/2) for compatibility with vertical fraction component
  // Handle single backslash
  result = result.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '$1/$2');
  // Handle double backslash (escaped)
  result = result.replace(/\\\\frac\{([^}]+)\}\{([^}]+)\}/g, '$1/$2');

  // Convert \times to ×
  result = result.replace(/\\times/g, '×');

  // Convert \div to ÷
  result = result.replace(/\\div/g, '÷');

  // Convert \cdot to ·
  result = result.replace(/\\cdot/g, '·');

  // Convert \pi to π
  result = result.replace(/\\pi/g, 'π');

  // Convert common angle notation: \angle ABC → ∠ABC
  result = result.replace(/\\angle/g, '∠');

  // Convert degree symbol: 90^\circ or 90^{\circ} → 90°
  result = result.replace(/\^\{?\\circ\}?/g, '°');

  // Convert square root: \sqrt{x} or \sqrt[n]{x} → √x or ⁿ√x
  result = result.replace(/\\sqrt\{([^}]+)\}/g, '√($1)');
  result = result.replace(/\\sqrt\[(\d+)\]\{([^}]+)\}/g, '[$1]√($2)');

  // Convert common superscripts: x^2 → x², x^3 → x³
  const superscripts: Record<string, string> = {
    '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
    '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
    '+': '⁺', '-': '⁻', '=': '⁼', '(': '⁽', ')': '⁾',
    'n': 'ⁿ'
  };
  result = result.replace(/\^(\d)/g, (_, digit) => superscripts[digit] || `^${digit}`);
  result = result.replace(/\^\{(\d)\}/g, (_, digit) => superscripts[digit] || `^{${digit}}`);
  result = result.replace(/\^([+-=()n])/g, (_, char) => superscripts[char] || `^${char}`);

  // Convert common subscripts: x_1 → x₁, x_2 → x₂
  const subscripts: Record<string, string> = {
    '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
    '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
    '+': '₊', '-': '₋', '=': '₌', '(': '₍', ')': '₎',
    'i': 'ᵢ', 'j': 'ⱼ', 'k': 'ₖ'
  };
  result = result.replace(/_(\d)/g, (_, digit) => subscripts[digit] || `_${digit}`);
  result = result.replace(/_\{(\d)\}/g, (_, digit) => subscripts[digit] || `_{${digit}}`);
  result = result.replace(/_([+-=()ijk])/g, (_, char) => subscripts[char] || `_${char}`);

  // Convert le/ge/ne/leq/geq: \le, \ge, \ne, \leq, \geq
  result = result.replace(/\\leq?/g, '≤');
  result = result.replace(/\\geq?/g, '≥');
  result = result.replace(/\\neq?/g, '≠');

  // Convert approx: \approx → ≈
  result = result.replace(/\\approx/g, '≈');

  // Convert infinity: \infty → ∞
  result = result.replace(/\\infty/g, '∞');

  // Clean up any remaining escaped backslashes
  result = result.replace(/\\\\/g, '\\');

  return result;
}

/**
 * Formats a quiz question for display, converting LaTeX to kid-friendly format.
 */
export function formatQuizQuestion(question: string): string {
  return formatLatexToKidFriendly(question);
}

/**
 * Formats a quiz option for display, converting LaTeX to kid-friendly format.
 */
export function formatQuizOption(option: string): string {
  return formatLatexToKidFriendly(option);
}

/**
 * Formats a quiz explanation for display, converting LaTeX to kid-friendly format.
 */
export function formatQuizExplanation(explanation: string): string {
  return formatLatexToKidFriendly(explanation);
}
