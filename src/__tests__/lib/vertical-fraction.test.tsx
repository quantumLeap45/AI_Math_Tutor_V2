/**
 * Vertical Fraction Tests
 * AI Math Tutor V2
 */

import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { parseFraction, formatMathWithVerticalFractions } from '@/components/math/VerticalFraction';

describe('parseFraction', () => {
  it('parses numeric fractions', () => {
    expect(parseFraction('1/2')).toEqual({ numerator: '1', denominator: '2' });
  });

  it('parses algebraic fractions', () => {
    expect(parseFraction('b/18')).toEqual({ numerator: 'b', denominator: '18' });
    expect(parseFraction('(c)/(4)')).toEqual({ numerator: 'c', denominator: '4' });
  });

  it('rejects invalid fraction strings', () => {
    expect(parseFraction('not a fraction')).toBeNull();
  });
});

describe('formatMathWithVerticalFractions', () => {
  it('replaces slash-form algebraic fractions in rendered output', () => {
    const { container } = render(<div>{formatMathWithVerticalFractions('Solve b/18 + 1/2')}</div>);

    expect(container.textContent).toContain('Solve');
    expect(container.textContent).toContain('b');
    expect(container.textContent).toContain('18');
    expect(container.textContent).toContain('1');
    expect(container.textContent).toContain('2');
    expect(container.textContent).not.toContain('b/18');
    expect(container.textContent).not.toContain('1/2');
  });
});
