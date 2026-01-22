/**
 * OpenAI Embeddings Utility
 * AI Math Tutor v2
 *
 * Generates embeddings using OpenAI's API for Pinecone vector storage.
 */

import OpenAI from 'openai';

// Initialize OpenAI client
const getOpenAIClient = () => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set');
  }
  return new OpenAI({ apiKey });
};

// Embedding model configuration
export const EMBEDDING_MODEL = 'text-embedding-3-small';
export const EMBEDDING_DIMENSIONS = 1536;

/**
 * Generate embedding for a single text string
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const openai = getOpenAIClient();

  try {
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: text,
      dimensions: EMBEDDING_DIMENSIONS,
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw new Error(`Failed to generate embedding: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Generate embeddings for multiple texts in batch
 * OpenAI supports batch embedding for efficiency
 */
export async function generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) {
    return [];
  }

  const openai = getOpenAIClient();

  try {
    // OpenAI supports up to 2048 texts in a single batch request
    // But we'll process in smaller batches to be safe
    const batchSize = 100;
    const allEmbeddings: number[][] = [];

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const response = await openai.embeddings.create({
        model: EMBEDDING_MODEL,
        input: batch,
        dimensions: EMBEDDING_DIMENSIONS,
      });

      // Extract embeddings in the same order as input
      const embeddings = response.data.map(item => item.embedding);
      allEmbeddings.push(...embeddings);

      console.log(`Generated embeddings for batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(texts.length / batchSize)}`);
    }

    return allEmbeddings;
  } catch (error) {
    console.error('Error generating batch embeddings:', error);
    throw new Error(`Failed to generate batch embeddings: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Create searchable text from a question for embedding
 * Combines grade, topic, subtopic, and question text for better semantic search
 */
export function createSearchableText(question: {
  gradeLevel: string;
  topic: string;
  subtopic: string;
  questionText: string;
}): string {
  return `${question.gradeLevel} ${question.topic} ${question.subtopic} ${question.questionText}`;
}

/**
 * Generate embedding for a search query
 */
export async function generateQueryEmbedding(query: string): Promise<number[]> {
  return generateEmbedding(query);
}
