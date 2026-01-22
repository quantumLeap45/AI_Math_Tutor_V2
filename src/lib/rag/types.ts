/**
 * RAG Type Definitions
 * AI Math Tutor v2
 *
 * Types for RAG (Retrieval-Augmented Generation) system integration.
 */

/**
 * Grade level for primary math questions
 */
export type GradeLevel = 'P1' | 'P2' | 'P3' | 'P4' | 'P5' | 'P6';

/**
 * Difficulty level for questions
 */
export type Difficulty = 'Easy' | 'Medium' | 'Hard';

/**
 * Parsed question from markdown files
 */
export interface RAGQuestion {
  /** Unique identifier (e.g., "P1-HP-001") */
  id: string;
  /** The actual question text */
  questionText: string;
  /** Grade level (P1, P2, etc.) */
  gradeLevel: GradeLevel;
  /** Main topic (e.g., "Addition") */
  topic: string;
  /** Specific subtopic (e.g., "Word problems") */
  subtopic: string;
  /** Difficulty level */
  difficulty: Difficulty;
  /** The correct answer */
  answer: string;
  /** Step-by-step working solution (optional) */
  workingSolution?: string;
  /** Emoji representation for visual hints (optional) */
  visualHint?: string;
  /** Source document (e.g., "Henry Park 2022") */
  source: string;
  /** Array of skills tested */
  skillsTested: string[];
  /** Multiple choice options (if applicable) */
  options?: string;
}

/**
 * Question record for Pinecone upsert
 * Uses integrated embeddings - text field is vectorized automatically
 */
export interface PineconeQuestionRecord {
  /** Unique record ID */
  _id: string;
  /** Searchable text content for embedding (grade + topic + question) */
  text: string;
  /** Grade level for filtering */
  gradeLevel: GradeLevel;
  /** Topic for filtering */
  topic: string;
  /** Subtopic for filtering */
  subtopic: string;
  /** Difficulty for filtering */
  difficulty: Difficulty;
  /** Question text */
  questionText: string;
  /** Answer */
  answer: string;
  /** Working solution (optional) */
  workingSolution?: string;
  /** Visual hint (optional) */
  visualHint?: string;
  /** Source document */
  source: string;
  /** Skills tested */
  skillsTested: string[];
}

/**
 * Search result from Pinecone with all metadata
 */
export interface SearchResult {
  /** Record ID */
  id: string;
  /** Relevance score (0-1, higher is better) */
  score: number;
  /** The question */
  question: RAGQuestion;
}

/**
 * Context for injection into AI prompt
 */
export interface RAGContext {
  /** Retrieved example questions */
  examples: RAGQuestion[];
  /** Formatted context string for prompt injection */
  formattedContext: string;
  /** Number of examples retrieved */
  count: number;
}

/**
 * Filter options for RAG search
 */
export interface RAGSearchFilters {
  /** Grade level filter (optional) */
  gradeLevel?: GradeLevel;
  /** Topic filter (optional) */
  topic?: string;
  /** Minimum difficulty (optional) */
  minDifficulty?: Difficulty;
  /** Maximum number of results */
  maxResults?: number;
}

/**
 * Detected intent from user message
 */
export interface UserIntent {
  /** Whether user is asking for questions/practice */
  wantsQuestions: boolean;
  /** Detected grade level (if any) */
  gradeLevel?: GradeLevel;
  /** Detected topic (if any) */
  topic?: string;
  /** Whether user wants visual hints */
  wantsVisualHints: boolean;
  /** Original query text */
  query: string;
}

/**
 * Parsed markdown file metadata
 */
export interface MarkdownFileMetadata {
  /** Filename */
  filename: string;
  /** Grade level extracted from filename */
  gradeLevel: GradeLevel;
  /** Source/school extracted from filename */
  source: string;
  /** Year extracted from filename */
  year?: string;
}
