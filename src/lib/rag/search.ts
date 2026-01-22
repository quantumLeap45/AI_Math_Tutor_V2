/**
 * RAG Search Functions
 * AI Math Tutor v2
 *
 * Handles semantic search and retrieval of math questions from Pinecone.
 * Uses OpenAI embeddings with vector similarity search.
 * Includes intent detection and context formatting for AI prompt injection.
 */

import { queryByVector, buildFilter, RAG_NAMESPACE } from './pinecone';
import { generateQueryEmbedding, createSearchableText } from './embeddings';
import {
  SearchResult,
  RAGContext,
  RAGSearchFilters,
  UserIntent,
  GradeLevel,
  RAGQuestion,
  Difficulty,
} from './types';

/**
 * Grade level mapping - various ways users might refer to grades
 */
const GRADE_KEYWORDS: Record<string, GradeLevel> = {
  'p1': 'P1',
  'primary 1': 'P1',
  'primary one': 'P1',
  'grade 1': 'P1',
  'grade one': 'P1',
  'p2': 'P2',
  'primary 2': 'P2',
  'primary two': 'P2',
  'grade 2': 'P2',
  'grade two': 'P2',
  'p3': 'P3',
  'primary 3': 'P3',
  'primary three': 'P3',
  'grade 3': 'P3',
  'grade three': 'P3',
  'p4': 'P4',
  'primary 4': 'P4',
  'primary four': 'P4',
  'grade 4': 'P4',
  'grade four': 'P4',
  'p5': 'P5',
  'primary 5': 'P5',
  'primary five': 'P5',
  'grade 5': 'P5',
  'grade five': 'P5',
  'p6': 'P6',
  'primary 6': 'P6',
  'primary six': 'P6',
  'grade 6': 'P6',
  'grade six': 'P6',
};

/**
 * Topic keywords for detection
 */
const TOPIC_KEYWORDS: Record<string, string[]> = {
  'Addition': ['add', 'addition', 'plus', 'sum', 'total', 'altogether', 'combine'],
  'Subtraction': ['subtract', 'subtraction', 'minus', 'difference', 'take away', 'left', 'remaining'],
  'Multiplication': ['multiply', 'multiplication', 'times', 'multiplied', 'groups of', 'product'],
  'Division': ['divide', 'division', 'shared', 'split', 'quotient', 'equal groups'],
  'Fractions': ['fraction', 'half', 'quarter', 'third', 'numerator', 'denominator'],
  'Money': ['money', 'dollars', 'cents', 'coins', 'notes', 'sgd', 'cost', 'price', 'spend'],
  'Time': ['time', 'clock', 'hour', 'minute', 'am', 'pm', 'o\'clock', 'duration'],
  'Length': ['length', 'long', 'short', 'cm', 'm', 'meter', 'centimeter', 'measure'],
  'Mass': ['mass', 'weight', 'kg', 'gram', 'kilogram', 'heavy', 'light', 'weigh', 'scales'],
  'Shapes': ['shape', 'triangle', 'square', 'circle', 'rectangle', 'sides', 'corners', 'vertices'],
  'Picture Graphs': ['picture graph', 'bar graph', 'chart', 'graph', 'data'],
  'Word Problems': ['word problem', 'story problem'],
  'Number Bonds': ['number bond', 'part whole', 'bond'],
  'Number Patterns': ['pattern', 'sequence', 'skip count'],
};

/**
 * Keywords that indicate user wants questions/practice
 */
const QUESTION_REQUEST_KEYWORDS = [
  'give me',
  'i need',
  'can you give',
  'practice',
  'question',
  'problem',
  'example',
  'test me',
  'quiz me',
  'generate',
  'create',
  'more questions',
  'another question',
  'help me practice',
  'some questions',
];

/**
 * Keywords that indicate user wants visual hints
 */
const VISUAL_HINT_KEYWORDS = [
  'visual',
  'picture',
  'image',
  'emoji',
  'drawing',
  'show me',
  'illustration',
];

/**
 * Detect user intent from message
 */
export function detectUserIntent(message: string): UserIntent {
  const normalizedMessage = message.toLowerCase();

  // Detect grade level
  let gradeLevel: GradeLevel | undefined;
  for (const [keyword, level] of Object.entries(GRADE_KEYWORDS)) {
    if (normalizedMessage.includes(keyword)) {
      gradeLevel = level;
      break;
    }
  }

  // Detect topic - use word boundary matching to avoid "m" matching in "me"
  let topic: string | undefined;
  for (const [topicName, keywords] of Object.entries(TOPIC_KEYWORDS)) {
    for (const keyword of keywords) {
      // Use regex with word boundaries for multi-char keywords, exact match for single-char
      const regex = new RegExp(`(?:^|\\s)${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\\\$&')}(?:\\s|$)`, 'i');
      if (regex.test(normalizedMessage) || (keyword.length === 1 && normalizedMessage.includes(` ${keyword} `))) {
        topic = topicName;
        break;
      }
    }
    if (topic) break;
  }

  // Detect if user wants questions
  const wantsQuestions = QUESTION_REQUEST_KEYWORDS.some(keyword =>
    normalizedMessage.includes(keyword)
  );

  // Detect if user wants visual hints
  const wantsVisualHints = VISUAL_HINT_KEYWORDS.some(keyword =>
    normalizedMessage.includes(keyword)
  );

  return {
    wantsQuestions,
    gradeLevel,
    topic,
    wantsVisualHints,
    query: message,
  };
}

/**
 * Search Pinecone for relevant questions using vector similarity
 */
export async function searchQuestions(
  query: string,
  filters: RAGSearchFilters = {}
): Promise<SearchResult[]> {
  // Generate embedding for the query
  let queryEmbedding: number[] | null = null;
  try {
    queryEmbedding = await generateQueryEmbedding(query);
  } catch (error) {
    console.error('Error generating query embedding:', error);
    return [];
  }

  if (!queryEmbedding) {
    return [];
  }

  // Build filter for Pinecone query
  const pineconeFilter = buildFilter({
    gradeLevel: filters.gradeLevel,
    topic: filters.topic,
    difficulty: filters.minDifficulty,
  });

  try {
    // Query Pinecone with the vector embedding
    const matches = await queryByVector(
      queryEmbedding,
      filters.maxResults || 5,
      RAG_NAMESPACE,
      pineconeFilter
    );

    // Convert Pinecone records to SearchResult format
    const searchResults: SearchResult[] = [];

    for (const match of matches) {
      if (match.metadata) {
        const metadata = match.metadata as Record<string, any>;

        searchResults.push({
          id: match.id,
          score: (match as any).score || 0,
          question: {
            id: match.id,
            questionText: String(metadata.questionText || ''),
            gradeLevel: metadata.gradeLevel || 'P1',
            topic: String(metadata.topic || ''),
            subtopic: String(metadata.subtopic || ''),
            difficulty: metadata.difficulty || 'Easy',
            answer: String(metadata.answer || ''),
            workingSolution: metadata.workingSolution,
            visualHint: metadata.visualHint,
            source: String(metadata.source || ''),
            skillsTested: metadata.skillsTested
              ? String(metadata.skillsTested).split(',').filter(Boolean)
              : [],
          } as RAGQuestion,
        });
      }
    }

    return searchResults;
  } catch (error) {
    console.error('Error searching Pinecone:', error);
    return [];
  }
}

/**
 * Format search results as context for AI prompt
 */
export function formatRAGContext(results: SearchResult[]): RAGContext {
  if (results.length === 0) {
    return {
      examples: [],
      formattedContext: '',
      count: 0,
    };
  }

  // Extract questions from search results
  const examples = results.map(r => r.question);

  // Format as markdown for prompt injection
  const formattedContext = `
## Relevant Example Questions

Use these MOE-style questions as reference for format, difficulty, and style:

${examples.map((q, i) => `
### Example ${i + 1}
**Grade:** ${q.gradeLevel} | **Topic:** ${q.topic} - ${q.subtopic} | **Difficulty:** ${q.difficulty}

**Question:** ${q.questionText}
${q.visualHint ? `**Visual Hint:** ${q.visualHint}` : ''}
**Answer:** ${q.answer}
${q.workingSolution ? `**Working:** ${q.workingSolution}` : ''}
`).join('\n')}

---
When generating new questions:
- Match the grade level and difficulty of the request
- Use Singapore context (names like Ahmad, Siti, Mei Ling, Ravi; places; SGD currency)
- For simple problems, consider including visual hints with emojis (e.g., 🍎 for apples, 🚗 for cars)
- Follow the MOE format shown in these examples
`;

  return {
    examples,
    formattedContext,
    count: examples.length,
  };
}

/**
 * Main RAG search function - detects intent and returns context
 */
export async function getRAGContext(message: string): Promise<RAGContext> {
  const intent = detectUserIntent(message);

  // Only search if user seems to want questions or it's a math-related query
  if (!intent.wantsQuestions && !intent.topic) {
    return {
      examples: [],
      formattedContext: '',
      count: 0,
    };
  }

  // Build search query
  const searchQuery = intent.topic
    ? `${intent.gradeLevel || ''} ${intent.topic} ${message}`.trim()
    : message;

  // Build filters
  const filters: RAGSearchFilters = {
    maxResults: 5,
  };

  if (intent.gradeLevel) {
    filters.gradeLevel = intent.gradeLevel;
  }

  if (intent.topic) {
    filters.topic = intent.topic;
  }

  // Search and format results
  const results = await searchQuestions(searchQuery, filters);
  return formatRAGContext(results);
}

/**
 * Search by specific filters (for more controlled queries)
 */
export async function searchByFilters(
  filters: RAGSearchFilters,
  queryText?: string
): Promise<RAGContext> {
  const query = queryText || `${filters.gradeLevel || ''} ${filters.topic || ''} math questions`.trim();

  const results = await searchQuestions(query, filters);
  return formatRAGContext(results);
}
