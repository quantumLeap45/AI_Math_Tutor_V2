'use client';

/**
 * Vertical Fraction Component
 * AI Math Tutor v2
 *
 * Displays fractions in the traditional Singapore primary school format:
 *    numerator
 *   ──────────
 *    denominator
 *
 * This is how fractions are taught in P1-P6 math in Singapore schools.
 */

import React from 'react';

interface VerticalFractionProps {
  /** The numerator (top number) */
  numerator: string | number;
  /** The denominator (bottom number) */
  denominator: string | number;
  /** CSS class name for custom styling */
  className?: string;
}

export function VerticalFraction({ numerator, denominator, className = '' }: VerticalFractionProps) {
  return (
    <span className={`inline-flex flex-col items-center justify-center align-middle mx-0.5 text-[0.85em] ${className}`}>
      {/* Numerator */}
      <span className="text-center leading-none px-0.5">
        {numerator}
      </span>
      {/* Fraction bar */}
      <span className="w-full border-t border-current my-px" />
      {/* Denominator */}
      <span className="text-center leading-none px-0.5">
        {denominator}
      </span>
    </span>
  );
}

/**
 * Parses a simple fraction string like "1/2" or "(1)/(2)" into numerator and denominator.
 * Returns null if the input is not a simple fraction.
 */
export function parseFraction(fractionStr: string): { numerator: string; denominator: string } | null {
  // Match patterns like: 1/2, (1)/(2), b/18, c/4, x1/y2, etc.
  // The regex captures:
  // - Optional opening parenthesis
  // - Numerator (letters/numbers, optional +/- segments)
  // - Optional closing parenthesis
  // - Forward slash
  // - Optional opening parenthesis
  // - Denominator (letters/numbers, optional +/- segments)
  // - Optional closing parenthesis
  const simpleFractionRegex = /^\(?([A-Za-z0-9]+(?:[+-][A-Za-z0-9]+)*)\)?\/\(?([A-Za-z0-9]+(?:[+-][A-Za-z0-9]+)*)\)?$/;
  const match = fractionStr.match(simpleFractionRegex);

  if (match) {
    return { numerator: match[1], denominator: match[2] };
  }

  return null;
}

/**
 * Formats math text by converting simple fraction patterns to vertical fractions.
 * Handles mixed numbers, multiple fractions in one expression, and adjacent operators.
 *
 * Examples:
 * - "1/2" → <VerticalFraction 1 over 2>
 * - "(1)/(2)" → <VerticalFraction 1 over 2>
 * - "1/2 + 1/4" → <VerticalFraction 1 over 2> + <VerticalFraction 1 over 4>
 * - "2 1/2" → 2 <VerticalFraction 1 over 2> (mixed number)
 *
 * @param text - Text containing fraction notation like "1/2" or "(1)/(2)"
 * @returns React nodes with vertical fractions rendered
 */
export function formatMathWithVerticalFractions(text: string): React.ReactNode {
  if (!text) return text;

  // Split by potential fraction patterns
  // This regex matches:
  // - Optional opening parenthesis
  // - One or more letters/numbers (numerator), optional +/- segments
  // - Optional closing parenthesis
  // - Forward slash
  // - Optional opening parenthesis
  // - One or more letters/numbers (denominator), optional +/- segments
  // - Optional closing parenthesis
  const fractionRegex = /(\(?[A-Za-z0-9]+(?:[+-][A-Za-z0-9]+)*\)?\/\(?[A-Za-z0-9]+(?:[+-][A-Za-z0-9]+)*\)?)/g;

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  while ((match = fractionRegex.exec(text)) !== null) {
    // Add text before the fraction
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    // Add the vertical fraction component
    const parsedFraction = parseFraction(match[1]);
    if (parsedFraction) {
      parts.push(
        <VerticalFraction
          key={`${match.index}-${parsedFraction.numerator}-${parsedFraction.denominator}`}
          numerator={parsedFraction.numerator}
          denominator={parsedFraction.denominator}
        />
      );
    } else {
      parts.push(match[1]);
    }

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text after the last fraction
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  // If no fractions were found, return original text
  if (parts.length === 0) {
    return text;
  }

  return <>{parts}</>;
}

/**
 * Formats math text by converting LaTeX to plain text and then
 * converting simple fraction patterns to vertical fractions.
 *
 * This is the main export for use in quiz components.
 */
export function formatMathForQuiz(text: string): React.ReactNode {
  // First, convert any remaining LaTeX to plain text
  // Import from math-format (we'll handle this circular dependency differently)
  // For now, just return the vertical fraction formatted text
  return formatMathWithVerticalFractions(text);
}
