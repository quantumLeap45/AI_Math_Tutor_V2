/**
 * Validation Tests
 * AI Math Tutor V2
 *
 * Tests for runtime validation using Zod schemas.
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
  messageRoleSchema,
  tutorModeSchema,
  primaryLevelSchema,
  difficultySchema,
  questionCountSchema,
  themeSchema,
  messageSchema,
  quizQuestionContextSchema,
  chatRequestSchema,
  quizRequestSchema,
  quizAnswerSchema,
  quizStateSchema,
  userSettingsSchema,
  chatSessionSchema,
  formatZodError,
  validateChatRequest,
  validateQuizRequest,
  type ChatRequest,
  type QuizRequest,
} from '@/lib/validation';

describe('Message Role Schema', () => {
  it('should accept valid message roles', () => {
    expect(messageRoleSchema.parse('user')).toBe('user');
    expect(messageRoleSchema.parse('assistant')).toBe('assistant');
    expect(messageRoleSchema.parse('quiz_summary')).toBe('quiz_summary');
  });

  it('should reject invalid message roles', () => {
    expect(() => messageRoleSchema.parse('admin')).toThrow();
    expect(() => messageRoleSchema.parse('system')).toThrow();
    expect(() => messageRoleSchema.parse('')).toThrow();
  });
});

describe('Tutor Mode Schema', () => {
  it('should accept valid tutor modes', () => {
    expect(tutorModeSchema.parse('SHOW')).toBe('SHOW');
    expect(tutorModeSchema.parse('TEACH')).toBe('TEACH');
  });

  it('should reject invalid tutor modes', () => {
    expect(() => tutorModeSchema.parse('SHOW_ANSWER')).toThrow();
    expect(() => tutorModeSchema.parse('hint')).toThrow();
    expect(() => tutorModeSchema.parse('')).toThrow();
  });
});

describe('Primary Level Schema', () => {
  it('should accept valid primary levels', () => {
    expect(primaryLevelSchema.parse('P1')).toBe('P1');
    expect(primaryLevelSchema.parse('P2')).toBe('P2');
    expect(primaryLevelSchema.parse('P3')).toBe('P3');
    expect(primaryLevelSchema.parse('P4')).toBe('P4');
    expect(primaryLevelSchema.parse('P5')).toBe('P5');
    expect(primaryLevelSchema.parse('P6')).toBe('P6');
  });

  it('should reject invalid primary levels', () => {
    expect(() => primaryLevelSchema.parse('P7')).toThrow();
    expect(() => primaryLevelSchema.parse('K1')).toThrow();
    expect(() => primaryLevelSchema.parse('S1')).toThrow();
  });
});

describe('Difficulty Schema', () => {
  it('should accept valid difficulty levels', () => {
    expect(difficultySchema.parse('easy')).toBe('easy');
    expect(difficultySchema.parse('medium')).toBe('medium');
    expect(difficultySchema.parse('hard')).toBe('hard');
    expect(difficultySchema.parse('all')).toBe('all');
  });

  it('should reject invalid difficulty levels', () => {
    expect(() => difficultySchema.parse('expert')).toThrow();
    expect(() => difficultySchema.parse('beginner')).toThrow();
  });
});

describe('Question Count Schema', () => {
  it('should accept valid question counts', () => {
    expect(questionCountSchema.parse(1)).toBe(1);
    expect(questionCountSchema.parse(5)).toBe(5);
    expect(questionCountSchema.parse(10)).toBe(10);
    expect(questionCountSchema.parse(15)).toBe(15);
    expect(questionCountSchema.parse(20)).toBe(20);
    expect(questionCountSchema.parse(25)).toBe(25);
  });

  it('should reject invalid question counts', () => {
    expect(() => questionCountSchema.parse(0)).toThrow();
    expect(() => questionCountSchema.parse(100)).toThrow();
    expect(() => questionCountSchema.parse(26)).toThrow();
  });
});

describe('Theme Schema', () => {
  it('should accept valid themes', () => {
    expect(themeSchema.parse('light')).toBe('light');
    expect(themeSchema.parse('dark')).toBe('dark');
  });

  it('should reject invalid themes', () => {
    expect(() => themeSchema.parse('auto')).toThrow();
    expect(() => themeSchema.parse('system')).toThrow();
  });
});

describe('Message Schema', () => {
  const validMessage = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    role: 'user' as const,
    content: 'What is 2 + 2?',
    timestamp: '2025-01-01T12:00:00.000Z',
  };

  it('should accept valid message', () => {
    const result = messageSchema.parse(validMessage);
    expect(result).toEqual(validMessage);
  });

  it('should accept message with imageUrl', () => {
    const messageWithImage = {
      ...validMessage,
      imageUrl: 'https://example.com/image.jpg',
    };
    const result = messageSchema.parse(messageWithImage);
    expect(result.imageUrl).toBe('https://example.com/image.jpg');
  });

  it('should accept message with quizSummary', () => {
    const messageWithQuiz = {
      ...validMessage,
      role: 'quiz_summary' as const,
      quizSummary: { score: 80 },
    };
    const result = messageSchema.parse(messageWithQuiz);
    expect(result.quizSummary).toEqual({ score: 80 });
  });

  it('should reject message without content', () => {
    expect(() => messageSchema.parse({ ...validMessage, content: '' })).toThrow();
  });

  it('should reject message with content too long', () => {
    expect(() =>
      messageSchema.parse({ ...validMessage, content: 'a'.repeat(10001) })
    ).toThrow();
  });

  it('should reject message with invalid UUID', () => {
    expect(() => messageSchema.parse({ ...validMessage, id: 'not-a-uuid' })).toThrow();
  });

  it('should reject message with invalid timestamp', () => {
    expect(() => messageSchema.parse({ ...validMessage, timestamp: 'not-a-date' })).toThrow();
  });

  it('should accept message with base64 imageUrl (no URL format restriction)', () => {
    // imageUrl now accepts any string (including base64 data URLs, not just http URLs)
    const result = messageSchema.parse({ ...validMessage, imageUrl: 'data:image/jpeg;base64,abc123' });
    expect(result.imageUrl).toBe('data:image/jpeg;base64,abc123');
  });
});

describe('Quiz Question Context Schema', () => {
  const validContext = {
    questionNumber: 1,
    totalQuestions: 10,
    question: { topic: 'Fractions' },
  };

  it('should accept valid quiz question context', () => {
    const result = quizQuestionContextSchema.parse(validContext);
    expect(result).toEqual(validContext);
  });

  it('should reject zero question number', () => {
    expect(() => quizQuestionContextSchema.parse({ ...validContext, questionNumber: 0 })).toThrow();
  });

  it('should reject negative question number', () => {
    expect(() => quizQuestionContextSchema.parse({ ...validContext, questionNumber: -1 })).toThrow();
  });

  it('should reject zero total questions', () => {
    expect(() => quizQuestionContextSchema.parse({ ...validContext, totalQuestions: 0 })).toThrow();
  });

  it('should reject empty topic', () => {
    expect(() =>
      quizQuestionContextSchema.parse({ ...validContext, question: { topic: '' } })
    ).toThrow();
  });
});

describe('Chat Request Schema', () => {
  const validChatRequest = {
    messages: [
      {
        id: '123e4567-e89b-12d3-a456-426614174000',
        role: 'user' as const,
        content: 'What is 2 + 2?',
        timestamp: '2025-01-01T12:00:00.000Z',
      },
    ],
    mode: 'TEACH' as const,
  };

  it('should accept valid chat request', () => {
    const result = chatRequestSchema.parse(validChatRequest);
    expect(result).toEqual(validChatRequest);
  });

  it('should accept chat request with images', () => {
    const requestWithImages = {
      ...validChatRequest,
      images: ['data:image/jpeg;base64,abc123'],
    };
    const result = chatRequestSchema.parse(requestWithImages);
    expect(result.images).toEqual(['data:image/jpeg;base64,abc123']);
  });

  it('should accept chat request with quiz context', () => {
    const requestWithContext = {
      ...validChatRequest,
      quizQuestionContext: {
        questionNumber: 1,
        totalQuestions: 10,
        question: { topic: 'Fractions' },
      },
    };
    const result = chatRequestSchema.parse(requestWithContext);
    expect(result.quizQuestionContext).toEqual(requestWithContext.quizQuestionContext);
  });

  it('should reject empty messages array', () => {
    expect(() => chatRequestSchema.parse({ ...validChatRequest, messages: [] })).toThrow();
  });

  it('should reject more than 100 messages', () => {
    const tooManyMessages = Array(101).fill(validChatRequest.messages[0]);
    expect(() =>
      chatRequestSchema.parse({ ...validChatRequest, messages: tooManyMessages })
    ).toThrow();
  });

  it('should reject invalid mode', () => {
    expect(() => chatRequestSchema.parse({ ...validChatRequest, mode: 'INVALID' as any })).toThrow();
  });

  it('should reject images array with image too large', () => {
    const largeImage = 'data:image/jpeg;base64,' + 'a'.repeat(6000000);
    expect(() => chatRequestSchema.parse({ ...validChatRequest, images: [largeImage] })).toThrow();
  });

  it('should reject images array with more than 3 items', () => {
    const smallImage = 'data:image/jpeg;base64,abc123';
    expect(() => chatRequestSchema.parse({ ...validChatRequest, images: [smallImage, smallImage, smallImage, smallImage] })).toThrow();
  });
});

describe('Quiz Request Schema', () => {
  const validQuizRequest = {
    level: 'P4' as const,
    topics: ['Fractions', 'Decimals'],
    difficulty: 'medium' as const,
    questionCount: 10 as const,
  };

  it('should accept valid quiz request', () => {
    const result = quizRequestSchema.parse(validQuizRequest);
    expect(result).toEqual(validQuizRequest);
  });

  it('should accept single topic', () => {
    const singleTopic = { ...validQuizRequest, topics: ['Algebra'] };
    const result = quizRequestSchema.parse(singleTopic);
    expect(result.topics).toHaveLength(1);
  });

  it('should accept all difficulty levels', () => {
    expect(quizRequestSchema.parse({ ...validQuizRequest, difficulty: 'easy' })).toBeTruthy();
    expect(quizRequestSchema.parse({ ...validQuizRequest, difficulty: 'medium' })).toBeTruthy();
    expect(quizRequestSchema.parse({ ...validQuizRequest, difficulty: 'hard' })).toBeTruthy();
    expect(quizRequestSchema.parse({ ...validQuizRequest, difficulty: 'all' })).toBeTruthy();
  });

  it('should reject empty topics array', () => {
    expect(() => quizRequestSchema.parse({ ...validQuizRequest, topics: [] })).toThrow();
  });

  it('should reject more than 5 topics', () => {
    const tooManyTopics = ['A', 'B', 'C', 'D', 'E', 'F'];
    expect(() => quizRequestSchema.parse({ ...validQuizRequest, topics: tooManyTopics })).toThrow();
  });

  it('should reject empty topic string', () => {
    expect(() => quizRequestSchema.parse({ ...validQuizRequest, topics: [''] })).toThrow();
  });

  it('should reject invalid level', () => {
    expect(() => quizRequestSchema.parse({ ...validQuizRequest, level: 'P7' as any })).toThrow();
  });

  it('should reject invalid difficulty', () => {
    expect(() => quizRequestSchema.parse({ ...validQuizRequest, difficulty: 'expert' as any })).toThrow();
  });

  it('should reject invalid question count', () => {
    expect(() => quizRequestSchema.parse({ ...validQuizRequest, questionCount: 26 as any })).toThrow();
  });
});

describe('Quiz Answer Schema', () => {
  const validQuizAnswer = {
    questionId: 'q123',
    selected: 'A' as const,
    answeredAt: '2025-01-01T12:00:00.000Z',
  };

  it('should accept valid quiz answer', () => {
    const result = quizAnswerSchema.parse(validQuizAnswer);
    expect(result).toEqual(validQuizAnswer);
  });

  it('should accept all valid options', () => {
    expect(quizAnswerSchema.parse({ ...validQuizAnswer, selected: 'A' as const })).toBeTruthy();
    expect(quizAnswerSchema.parse({ ...validQuizAnswer, selected: 'B' as const })).toBeTruthy();
    expect(quizAnswerSchema.parse({ ...validQuizAnswer, selected: 'C' as const })).toBeTruthy();
    expect(quizAnswerSchema.parse({ ...validQuizAnswer, selected: 'D' as const })).toBeTruthy();
  });

  it('should reject empty question ID', () => {
    expect(() => quizAnswerSchema.parse({ ...validQuizAnswer, questionId: '' })).toThrow();
  });

  it('should reject invalid option', () => {
    expect(() => quizAnswerSchema.parse({ ...validQuizAnswer, selected: 'E' as any })).toThrow();
  });

  it('should reject invalid timestamp', () => {
    expect(() => quizAnswerSchema.parse({ ...validQuizAnswer, answeredAt: 'not-a-date' })).toThrow();
  });
});

describe('Quiz State Schema', () => {
  const validQuizState = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    config: {
      level: 'P4' as const,
      topics: ['Fractions'],
      difficulty: 'medium' as const,
      questionCount: 10 as const,
    },
    currentIndex: 0,
    showFeedback: false,
    startedAt: '2025-01-01T12:00:00.000Z',
    isCompleted: false,
  };

  it('should accept valid quiz state', () => {
    const result = quizStateSchema.parse(validQuizState);
    expect(result).toEqual(validQuizState);
  });

  it('should reject negative current index', () => {
    expect(() => quizStateSchema.parse({ ...validQuizState, currentIndex: -1 })).toThrow();
  });

  it('should reject invalid UUID for quiz ID', () => {
    expect(() => quizStateSchema.parse({ ...validQuizState, id: 'not-a-uuid' })).toThrow();
  });

  it('should reject invalid start time', () => {
    expect(() => quizStateSchema.parse({ ...validQuizState, startedAt: 'not-a-date' })).toThrow();
  });

  it('should accept completed quiz state', () => {
    const completedState = { ...validQuizState, isCompleted: true, currentIndex: 9 };
    const result = quizStateSchema.parse(completedState);
    expect(result.isCompleted).toBe(true);
  });
});

describe('User Settings Schema', () => {
  const validUserSettings = {
    theme: 'light' as const,
    defaultMode: 'TEACH' as const,
    sidebarCollapsed: false,
  };

  it('should accept valid user settings', () => {
    const result = userSettingsSchema.parse(validUserSettings);
    expect(result).toEqual(validUserSettings);
  });

  it('should accept settings with last active session', () => {
    const settingsWithSession = {
      ...validUserSettings,
      lastActiveSession: '123e4567-e89b-12d3-a456-426614174000',
    };
    const result = userSettingsSchema.parse(settingsWithSession);
    expect(result.lastActiveSession).toBe('123e4567-e89b-12d3-a456-426614174000');
  });

  it('should reject invalid theme', () => {
    expect(() => userSettingsSchema.parse({ ...validUserSettings, theme: 'auto' as any })).toThrow();
  });

  it('should reject invalid mode', () => {
    expect(() => userSettingsSchema.parse({ ...validUserSettings, defaultMode: 'HINT' as any })).toThrow();
  });

  it('should reject invalid session ID', () => {
    expect(() =>
      userSettingsSchema.parse({ ...validUserSettings, lastActiveSession: 'not-a-uuid' as any })
    ).toThrow();
  });
});

describe('Chat Session Schema', () => {
  const validChatSession = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    title: 'Math Help Session',
    mode: 'TEACH' as const,
    messages: [
      {
        id: '223e4567-e89b-12d3-a456-426614174001',
        role: 'user' as const,
        content: 'Hello',
        timestamp: '2025-01-01T12:00:00.000Z',
      },
    ],
    createdAt: '2025-01-01T12:00:00.000Z',
    updatedAt: '2025-01-01T12:00:00.000Z',
  };

  it('should accept valid chat session', () => {
    const result = chatSessionSchema.parse(validChatSession);
    expect(result).toEqual(validChatSession);
  });

  it('should reject empty title', () => {
    expect(() => chatSessionSchema.parse({ ...validChatSession, title: '' })).toThrow();
  });

  it('should reject title too long', () => {
    expect(() =>
      chatSessionSchema.parse({ ...validChatSession, title: 'a'.repeat(101) })
    ).toThrow();
  });

  it('should reject too many messages', () => {
    const tooManyMessages = Array(101).fill(validChatSession.messages[0]);
    expect(() => chatSessionSchema.parse({ ...validChatSession, messages: tooManyMessages })).toThrow();
  });

  it('should reject invalid UUID', () => {
    expect(() => chatSessionSchema.parse({ ...validChatSession, id: 'not-a-uuid' })).toThrow();
  });
});

describe('formatZodError', () => {
  it('should format Zod error correctly', () => {
    const schema = z.object({
      name: z.string().min(3),
      age: z.number().min(18),
    });

    try {
      schema.parse({ name: 'Jo', age: 15 });
    } catch (error) {
      const formatted = formatZodError(error as z.ZodError);

      expect(formatted).toHaveProperty('error', 'Validation failed');
      expect(formatted).toHaveProperty('details');
      expect(formatted.details).toHaveProperty('name');
      expect(formatted.details).toHaveProperty('age');
    }
  });

  it('should handle nested paths', () => {
    const schema = z.object({
      user: z.object({
        email: z.string().email(),
      }),
    });

    try {
      schema.parse({ user: { email: 'not-an-email' } });
    } catch (error) {
      const formatted = formatZodError(error as z.ZodError);

      expect(formatted.details).toHaveProperty('user.email');
    }
  });

  it('should handle root level errors', () => {
    const schema = z.object({
      items: z.array(z.string()).min(1),
    });

    try {
      schema.parse({ items: [] });
    } catch (error) {
      const formatted = formatZodError(error as z.ZodError);

      expect(formatted.details).toHaveProperty('items');
    }
  });

  it('should collect multiple errors for same field', () => {
    const schema = z.object({
      password: z.string().min(8).max(20),
    });

    try {
      schema.parse({ password: 'abc' });
    } catch (error) {
      const formatted = formatZodError(error as z.ZodError);

      expect(formatted.details?.password).toBeInstanceOf(Array);
      expect(formatted.details?.password.length).toBeGreaterThan(0);
    }
  });
});

describe('validateChatRequest', () => {
  it('should validate and return typed data', () => {
    const validData = {
      messages: [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          role: 'user' as const,
          content: 'Test',
          timestamp: '2025-01-01T12:00:00.000Z',
        },
      ],
      mode: 'TEACH' as const,
    };

    const result = validateChatRequest(validData);

    expect(result).toEqual(validData);
  });

  it('should throw on invalid data', () => {
    const invalidData = {
      messages: [],
      mode: 'INVALID' as any,
    };

    expect(() => validateChatRequest(invalidData)).toThrow();
  });

  it('should return ChatRequest type', () => {
    const validData = {
      messages: [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          role: 'user' as const,
          content: 'Test',
          timestamp: '2025-01-01T12:00:00.000Z',
        },
      ],
      mode: 'TEACH' as const,
    };

    const result: ChatRequest = validateChatRequest(validData);

    expect(result.messages[0].content).toBeTypeOf('string');
  });
});

describe('validateQuizRequest', () => {
  it('should validate and return typed data', () => {
    const validData = {
      level: 'P4' as const,
      topics: ['Fractions'],
      difficulty: 'medium' as const,
      questionCount: 10 as const,
    };

    const result = validateQuizRequest(validData);

    expect(result).toEqual(validData);
  });

  it('should throw on invalid data', () => {
    const invalidData = {
      level: 'P7' as any,
      topics: [],
      difficulty: 'invalid' as any,
      questionCount: 25 as any,
    };

    expect(() => validateQuizRequest(invalidData)).toThrow();
  });

  it('should return QuizRequest type', () => {
    const validData = {
      level: 'P4' as const,
      topics: ['Fractions'],
      difficulty: 'medium' as const,
      questionCount: 10 as const,
    };

    const result: QuizRequest = validateQuizRequest(validData);

    expect(result.topics[0]).toBeTypeOf('string');
  });
});
