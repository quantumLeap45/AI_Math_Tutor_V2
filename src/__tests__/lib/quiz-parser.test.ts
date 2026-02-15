/**
 * Quiz Parser Tests
 * AI Math Tutor V2
 */

import { describe, it, expect } from 'vitest';
import { parseQuizSettings } from '@/lib/quiz-parser';

describe('parseQuizSettings', () => {
  it('caps oversized numeric requests to 25', () => {
    const parsed = parseQuizSettings('Give me 30 P6 algebra questions');

    expect(parsed.questionCount).toBe(25);
    expect(parsed.requestedQuestionCount).toBe(30);
    expect(parsed.wasQuestionCountCapped).toBe(true);
    expect(parsed.maxQuestionCount).toBe(25);
  });

  it('supports word-based counts up to the cap', () => {
    const parsed = parseQuizSettings('Can you generate twenty five P4 fractions questions?');

    expect(parsed.questionCount).toBe(25);
    expect(parsed.requestedQuestionCount).toBe(25);
    expect(parsed.wasQuestionCountCapped).toBe(false);
  });

  it('uses explicit in-range numeric requests without capping', () => {
    const parsed = parseQuizSettings('Give me 15 P6 ratio questions');

    expect(parsed.questionCount).toBe(15);
    expect(parsed.requestedQuestionCount).toBe(15);
    expect(parsed.wasQuestionCountCapped).toBe(false);
  });

  it('does not confuse grade level with question count', () => {
    const parsed = parseQuizSettings('Give me P6 ratio questions');

    expect(parsed.level).toBe('P6');
    expect(parsed.questionCount).toBe(5);
    expect(parsed.requestedQuestionCount).toBeNull();
    expect(parsed.wasQuestionCountCapped).toBe(false);
  });
});
