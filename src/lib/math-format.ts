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

  // Strip \text{...}, \textbf{...}, \mathrm{...}, \mathbf{...} — keep inner content
  result = result.replace(/\\text(?:bf|rm|it)?\{([^}]+)\}/g, '$1');
  result = result.replace(/\\math(?:rm|bf|it|cal)?\{([^}]+)\}/g, '$1');

  // Strip \left and \right delimiters (e.g., \left( ... \right))
  result = result.replace(/\\left\s*/g, '');
  result = result.replace(/\\right\s*/g, '');

  // Convert LaTeX spacing commands to regular space
  result = result.replace(/\\[,;:!]\s*/g, ' ');
  result = result.replace(/\\quad\s*/g, ' ');
  result = result.replace(/\\qquad\s*/g, ' ');

  // Convert \% to %
  result = result.replace(/\\%/g, '%');

  // Convert fractions \frac{a}{b} or \\frac{a}{b} to a/b
  // Using simple format (1/2) for compatibility with vertical fraction component
  // Handle single backslash
  result = result.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '$1/$2');
  // Handle double backslash (escaped)
  result = result.replace(/\\\\frac\{([^}]+)\}\{([^}]+)\}/g, '$1/$2');

  // Convert math asterisk to multiplication sign for student-friendly display
  // Matches contexts like "2*3", "2 * 3", "b*18", "(a+b)*4"
  result = result.replace(/(?<=\b[\dA-Za-z)\]])\s*\*\s*(?=[\dA-Za-z([])/g, ' × ');

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

  // Normalize common area/volume unit forms to superscripts:
  // cm2 -> cm², m3 -> m³, cm squared -> cm², m cubed -> m³
  // Use a non-word prefix guard to avoid converting variable names like "xm2".
  result = result.replace(
    /(^|[^\w])(?:sq|sq\.|square)\s*((?:cm|mm|km|m|in|ft))\b/gi,
    (_, prefix, unit) => `${prefix}${unit}²`
  );
  result = result.replace(
    /(^|[^\w])(?:cu|cu\.|cubic)\s*((?:cm|mm|km|m|in|ft))\b/gi,
    (_, prefix, unit) => `${prefix}${unit}³`
  );
  result = result.replace(
    /(^|[^\w])((?:cm|mm|km|m|in|ft))\s*(?:sq|sq\.|square)\b/gi,
    (_, prefix, unit) => `${prefix}${unit}²`
  );
  result = result.replace(
    /(^|[^\w])((?:cm|mm|km|m|in|ft))\s*(?:cu|cu\.|cubic|cube|cubed)\b/gi,
    (_, prefix, unit) => `${prefix}${unit}³`
  );
  result = result.replace(
    /(^|[^\w])((?:cm|mm|km|m|in|ft))\s*(?:\^\s*\{?\s*3\s*\}?|3|cubed)\b/gi,
    (_, prefix, unit) => `${prefix}${unit}³`
  );
  result = result.replace(
    /(^|[^\w])((?:cm|mm|km|m|in|ft))\s*(?:\^\s*\{?\s*2\s*\}?|2|squared)\b/gi,
    (_, prefix, unit) => `${prefix}${unit}²`
  );

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
