/**
 * Math Format Tests
 * AI Math Tutor V2
 */

import { describe, it, expect } from 'vitest';
import { formatLatexToKidFriendly } from '@/lib/math-format';

describe('formatLatexToKidFriendly', () => {
  it('converts LaTeX multiplication to ×', () => {
    expect(formatLatexToKidFriendly('2\\times3')).toBe('2×3');
  });

  it('converts asterisk multiplication to × in math expressions', () => {
    expect(formatLatexToKidFriendly('2 * 18')).toBe('2 × 18');
    expect(formatLatexToKidFriendly('b*18')).toBe('b × 18');
  });

  it('keeps non-math leading bullet asterisk untouched', () => {
    expect(formatLatexToKidFriendly('* Step 1')).toBe('* Step 1');
  });

  it('strips common LaTeX text wrappers from question content', () => {
    expect(formatLatexToKidFriendly('x\\text{ notebook cost } + 10')).toBe('x notebook cost  + 10');
  });
});
