import { describe, expect, it } from 'vitest';
import { findVisualDependencyIssues, getVisualDependencyLabels, hasVisualDependency } from '@/lib/quiz/guardrails';
import { QuizQuestion } from '@/types';

function makeQuestion(overrides: Partial<QuizQuestion> = {}): QuizQuestion {
  return {
    id: 'Generated-P4-math-1',
    level: 'P4',
    topic: 'Geometry',
    subtopic: 'Angles',
    difficulty: 'medium',
    question: 'Which angle is obtuse?',
    options: {
      A: '45°',
      B: '90°',
      C: '120°',
      D: '180°',
    },
    correctAnswer: 'C',
    explanation: 'An obtuse angle is greater than 90° and less than 180°.',
    ...overrides,
  };
}

describe('quiz guardrails', () => {
  it('detects visual-dependent text patterns', () => {
    expect(hasVisualDependency('In the figure below, line AB is parallel to line CD.')).toBe(true);
    expect(hasVisualDependency('Look at the bar graph and choose the highest value.')).toBe(true);
    expect(hasVisualDependency('Find 3/4 of 24.')).toBe(false);
    expect(
      hasVisualDependency(
        'In the pie chart, 25% are girls, 45% are boys, and the rest are teachers. Find the ratio of boys:girls:teachers.'
      )
    ).toBe(false);
  });

  it('returns readable labels for matched patterns', () => {
    const labels = getVisualDependencyLabels('Refer to the diagram below and find angle x.');
    expect(labels.length).toBeGreaterThan(0);
    expect(labels.some(label => label.includes('below/above visual reference') || label.includes('refer to visual'))).toBe(true);
  });

  it('finds issues across question and options', () => {
    const questions = [
      makeQuestion(),
      makeQuestion({
        question: 'In the figure below, find angle x.',
        options: {
          A: '58',
          B: '70',
          C: 'Line DE (if DE is drawn touching AB at 90 degrees)',
          D: '94',
        },
      }),
    ];

    const issues = findVisualDependencyIssues(questions);
    expect(issues.length).toBeGreaterThan(0);
    expect(issues.some(issue => issue.questionIndex === 1 && issue.field === 'question')).toBe(true);
    expect(issues.some(issue => issue.questionIndex === 1 && issue.field === 'optionC')).toBe(true);
  });
});
