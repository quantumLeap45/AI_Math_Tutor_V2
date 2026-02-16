import { describe, expect, it } from 'vitest';
import { parseAIValidatorResponse } from '@/lib/quiz/ai-validator';

describe('parseAIValidatorResponse', () => {
  it('parses strict failedQuestions payload', () => {
    const raw = JSON.stringify({
      failedQuestions: [
        {
          questionIndex: 2,
          reasonCodes: ['logic_inconsistent', 'answer_mismatch'],
          message: 'Question premise is invalid.',
          regenerationHint: 'Regenerate with consistent geometry premise.',
        },
      ],
    });

    const issues = parseAIValidatorResponse(raw, 5);
    expect(issues).toHaveLength(1);
    expect(issues[0].questionIndex).toBe(2);
    expect(issues[0].reasonCodes).toEqual(['LOGIC_INCONSISTENT', 'ANSWER_MISMATCH']);
  });

  it('parses fallback questions[] FAIL format', () => {
    const raw = JSON.stringify({
      questions: [
        { questionIndex: 0, status: 'PASS' },
        {
          questionIndex: 4,
          status: 'FAIL',
          reasonCodes: ['UNSOLVABLE_WITHOUT_IMAGE'],
          message: 'Depends on missing figure.',
          regenerationHint: 'Use text-only solvable wording.',
        },
      ],
    });

    const issues = parseAIValidatorResponse(raw, 6);
    expect(issues).toHaveLength(1);
    expect(issues[0].questionIndex).toBe(4);
  });

  it('ignores invalid indexes and handles markdown fences', () => {
    const raw = `\n\`\`\`json\n${JSON.stringify({
      failedQuestions: [
        { questionIndex: -1, reasonCodes: ['X'], message: 'bad', regenerationHint: 'bad' },
        { questionIndex: 99, reasonCodes: ['X'], message: 'bad', regenerationHint: 'bad' },
        { questionIndex: 1, reasonCodes: [], message: '', regenerationHint: '' },
      ],
    })}\n\`\`\``;

    const issues = parseAIValidatorResponse(raw, 3);
    expect(issues).toHaveLength(1);
    expect(issues[0].questionIndex).toBe(1);
    expect(issues[0].reasonCodes).toEqual(['AI_VALIDATION_FAILED']);
  });
});
