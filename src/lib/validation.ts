/**
 * Runtime Validation Schemas
 * AI Math Tutor V2
 *
 * Enterprise-grade input validation using Zod.
 * Validates all API request/response data at runtime.
 */

import { z } from 'zod';

/**
 * Valid message roles
 */
export const messageRoleSchema = z.enum(['user', 'assistant', 'quiz_summary']);

/**
 * Valid tutor modes
 */
export const tutorModeSchema = z.enum(['SHOW', 'TEACH']);

/**
 * Valid primary levels
 */
export const primaryLevelSchema = z.enum(['P1', 'P2', 'P3', 'P4', 'P5', 'P6']);

/**
 * Valid difficulty levels
 */
export const difficultySchema = z.enum(['easy', 'medium', 'hard', 'all']);

/**
 * Valid question counts
 */
export const questionCountSchema = z.union([z.literal(5), z.literal(10), z.literal(15), z.literal(20)]);

/**
 * Valid themes
 */
export const themeSchema = z.enum(['light', 'dark']);

/**
 * Message schema
 */
export const messageSchema = z.object({
  id: z.string().uuid('Invalid message ID format'),
  role: messageRoleSchema,
  content: z.string()
    .min(1, 'Message content cannot be empty')
    .max(10000, 'Message content too long (max 10000 characters)'),
  imageUrl: z.string().url('Invalid image URL format').optional(),
  timestamp: z.string().datetime('Invalid timestamp format'),
  quizSummary: z.any().optional(), // Complex object, validated separately if needed
});

/**
 * Quiz question context schema
 */
export const quizQuestionContextSchema = z.object({
  questionNumber: z.number().int().positive('Question number must be positive'),
  totalQuestions: z.number().int().positive('Total questions must be positive'),
  question: z.object({
    topic: z.string().min(1, 'Topic cannot be empty'),
  }),
});

/**
 * Chat request body schema
 */
export const chatRequestSchema = z.object({
  messages: z.array(messageSchema)
    .min(1, 'At least one message is required')
    .max(100, 'Too many messages (max 100)'),
  mode: tutorModeSchema,
  image: z.string().max(5000000, 'Image too large (max ~5MB base64)').optional(),
  quizQuestionContext: quizQuestionContextSchema.optional(),
});

/**
 * Quiz request body schema
 */
export const quizRequestSchema = z.object({
  level: primaryLevelSchema,
  topics: z.array(z.string().min(1, 'Topic cannot be empty'))
    .min(1, 'At least one topic is required')
    .max(5, 'Too many topics (max 5)'),
  difficulty: difficultySchema,
  questionCount: questionCountSchema,
});

/**
 * Quiz answer schema
 */
export const quizAnswerSchema = z.object({
  questionId: z.string().min(1, 'Question ID required'),
  selected: z.enum(['A', 'B', 'C', 'D'], 'Invalid option selected'),
  answeredAt: z.string().datetime('Invalid timestamp format'),
});

/**
 * Quiz state schema
 */
export const quizStateSchema = z.object({
  id: z.string().uuid('Invalid quiz ID format'),
  config: z.object({
    level: primaryLevelSchema,
    topics: z.array(z.string().min(1)),
    difficulty: difficultySchema,
    questionCount: questionCountSchema,
  }),
  currentIndex: z.number().int().nonnegative('Invalid current index'),
  showFeedback: z.boolean(),
  startedAt: z.string().datetime('Invalid start time'),
  isCompleted: z.boolean(),
});

/**
 * User settings schema
 */
export const userSettingsSchema = z.object({
  theme: themeSchema,
  defaultMode: tutorModeSchema,
  sidebarCollapsed: z.boolean(),
  lastActiveSession: z.string().uuid().optional(),
});

/**
 * Chat session schema
 */
export const chatSessionSchema = z.object({
  id: z.string().uuid('Invalid session ID format'),
  title: z.string().min(1, 'Title cannot be empty').max(100, 'Title too long (max 100 characters)'),
  mode: tutorModeSchema,
  messages: z.array(messageSchema).max(100, 'Too many messages (max 100)'),
  createdAt: z.string().datetime('Invalid creation timestamp'),
  updatedAt: z.string().datetime('Invalid update timestamp'),
});

/**
 * Validation error response format
 */
export const validationErrorResponseSchema = z.object({
  error: z.string(),
  details: z.any().optional(),
});

// Type exports from schemas
export type MessageRole = z.infer<typeof messageRoleSchema>;
export type TutorMode = z.infer<typeof tutorModeSchema>;
export type PrimaryLevel = z.infer<typeof primaryLevelSchema>;
export type Difficulty = z.infer<typeof difficultySchema>;
export type QuestionCount = z.infer<typeof questionCountSchema>;
export type Theme = z.infer<typeof themeSchema>;
export type Message = z.infer<typeof messageSchema>;
export type QuizQuestionContext = z.infer<typeof quizQuestionContextSchema>;
export type ChatRequest = z.infer<typeof chatRequestSchema>;
export type QuizRequest = z.infer<typeof quizRequestSchema>;
export type QuizAnswer = z.infer<typeof quizAnswerSchema>;
export type QuizState = z.infer<typeof quizStateSchema>;
export type UserSettings = z.infer<typeof userSettingsSchema>;
export type ChatSession = z.infer<typeof chatSessionSchema>;

/**
 * Helper function to format Zod errors for API responses
 */
export function formatZodError(error: z.ZodError): { error: string; details?: Record<string, string[]> } {
  const details: Record<string, string[]> = {};

  error.issues.forEach((err) => {
    const path = err.path.join('.') || 'root';
    if (!details[path]) {
      details[path] = [];
    }
    details[path].push(err.message);
  });

  return {
    error: 'Validation failed',
    details,
  };
}

/**
 * Helper to validate chat request and throw if invalid
 */
export function validateChatRequest(data: unknown): ChatRequest {
  return chatRequestSchema.parse(data);
}

/**
 * Helper to validate quiz request and throw if invalid
 */
export function validateQuizRequest(data: unknown): QuizRequest {
  return quizRequestSchema.parse(data);
}
