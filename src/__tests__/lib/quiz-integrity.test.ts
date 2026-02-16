import { describe, expect, it } from 'vitest';
import { QuizQuestion } from '@/types';
import { getFailingQuestionIndexes, validateQuizBatch } from '@/lib/quiz/integrity';

function makeQuestion(overrides: Partial<QuizQuestion> = {}): QuizQuestion {
  return {
    id: 'Generated-P4-math-1',
    level: 'P4',
    topic: 'Math',
    subtopic: 'General',
    difficulty: 'medium',
    question: 'What is 3 + 4?',
    options: {
      A: '5',
      B: '6',
      C: '7',
      D: '8',
    },
    correctAnswer: 'C',
    explanation: 'Step 1: 3 + 4 = 7. Answer: 7.',
    ...overrides,
  };
}

describe('quiz integrity validator', () => {
  it('flags unresolved visual dependency references', () => {
    const questions = [
      makeQuestion({
        question: 'In the figure below, line AB is parallel to line CD. Which line segment is perpendicular to AB?',
        options: {
          A: 'Line BC',
          B: 'Line AD',
          C: 'Line DE',
          D: 'Line AC',
        },
      }),
    ];

    const issues = validateQuizBatch(questions);
    expect(issues.some(issue => issue.code === 'VISUAL_DEPENDENCY')).toBe(true);
  });

  it('allows self-contained visual descriptions', () => {
    const questions = [
      makeQuestion({
        question: 'In the figure below, a rectangle has length 8 cm and width 3 cm. Find its area.',
        options: { A: '11 cm²', B: '24 cm²', C: '16 cm²', D: '5 cm²' },
        correctAnswer: 'B',
        explanation: 'Step 1: Area = 8 × 3 = 24. Answer: 24 cm².',
      }),
    ];

    const issues = validateQuizBatch(questions);
    expect(issues.some(issue => issue.code === 'VISUAL_DEPENDENCY')).toBe(false);
  });

  it('flags explanation answer text that conflicts with correctAnswer key', () => {
    const questions = [
      makeQuestion({
        question: 'A square has a side length of 5 cm. What is the value of its area compared to its perimeter?',
        options: {
          A: 'The area is smaller than the perimeter.',
          B: 'The area is equal to the perimeter.',
          C: 'The area is larger than the perimeter.',
          D: 'The perimeter is twice the area.',
        },
        correctAnswer: 'A',
        explanation: 'Step 1: Area = 25, perimeter = 20. Answer: The area is larger than the perimeter.',
      }),
    ];

    const issues = validateQuizBatch(questions);
    expect(issues.some(issue => issue.code === 'EXPLANATION_ANSWER_MISMATCH')).toBe(true);
    expect(issues.some(issue => issue.code === 'DETERMINISTIC_MATH_MISMATCH')).toBe(true);
  });

  it('flags ambiguous cross-unit comparisons without numerical clarifier', () => {
    const questions = [
      makeQuestion({
        question: 'A square has side length 5 cm. Compare its area to its perimeter.',
        options: {
          A: 'The area is smaller than the perimeter.',
          B: 'The area is equal to the perimeter.',
          C: 'The area is larger than the perimeter.',
          D: 'Cannot be determined',
        },
        correctAnswer: 'C',
      }),
    ];

    const issues = validateQuizBatch(questions);
    expect(issues.some(issue => issue.code === 'AMBIGUOUS_COMPARISON')).toBe(true);
  });

  it('flags deterministic expression-answer mismatches', () => {
    const questions = [
      makeQuestion({
        question: 'Find the value of 8c - 2 × 3 + 10 when c = 12.',
        options: {
          A: '58',
          B: '70',
          C: '82',
          D: '100',
        },
        correctAnswer: 'A',
        explanation: 'Step 1: Substitute c=12. Step 2: Evaluate. Answer: 100.',
      }),
    ];

    const issues = validateQuizBatch(questions);
    expect(issues.some(issue => issue.code === 'DETERMINISTIC_MATH_MISMATCH')).toBe(true);
  });

  it('flags duplicate options and returns unique failing indexes', () => {
    const questions = [
      makeQuestion({
        options: {
          A: '24',
          B: '24',
          C: '30',
          D: '36',
        },
      }),
      makeQuestion({
        id: 'Generated-P4-math-2',
        question: 'Refer to the diagram below and identify the shaded shape.',
        options: {
          A: 'Triangle',
          B: 'Rectangle',
          C: 'Circle',
          D: 'Hexagon',
        },
      }),
    ];

    const issues = validateQuizBatch(questions);
    expect(issues.some(issue => issue.code === 'DUPLICATE_OPTIONS')).toBe(true);

    const failingIndexes = getFailingQuestionIndexes(issues);
    expect(failingIndexes).toEqual([0, 1]);
  });
});
