/**
 * Pinecone Client
 * AI Math Tutor v2
 *
 * Handles connection to Pinecone vector database for RAG system.
 * Uses OpenAI embeddings with traditional vector upsert and query.
 */

import { Pinecone, ScoredPineconeRecord } from '@pinecone-database/pinecone';
import { RAGQuestion } from './types';

function sanitizeEnvValue(raw: string | undefined): string | undefined {
  const trimmed = raw?.trim();
  if (!trimmed) return undefined;
  if (trimmed.length >= 2 && trimmed[0] === trimmed[trimmed.length - 1] && (trimmed[0] === '"' || trimmed[0] === '\'')) {
    return trimmed.slice(1, -1).trim() || undefined;
  }
  return trimmed;
}

// Get environment variables dynamically (for scripts that use dotenv)
const getPineconeEnv = () => ({
  apiKey: sanitizeEnvValue(process.env.PINECONE_API_KEY),
  indexName: sanitizeEnvValue(process.env.PINECONE_INDEX_NAME) || 'ai-math-tutor-v2',
  indexHost: sanitizeEnvValue(process.env.PINECONE_INDEX_HOST),
});

// Singleton client instance
let pcClient: Pinecone | null = null;

/**
 * Get or create Pinecone client singleton
 */
export function getPineconeClient(): Pinecone {
  if (!pcClient) {
    const { apiKey } = getPineconeEnv();
    if (!apiKey) {
      throw new Error('PINECONE_API_KEY environment variable is not set');
    }
    pcClient = new Pinecone({ apiKey });
  }
  return pcClient;
}

/**
 * Get the Pinecone index for math questions
 */
export function getPineconeIndex() {
  const pc = getPineconeClient();
  const { indexName, indexHost } = getPineconeEnv();

  // If host is provided, use it to target the specific index
  if (indexHost) {
    return pc.index(indexName, indexHost);
  }

  return pc.index(indexName);
}

/**
 * Check if Pinecone is properly configured
 */
export function isPineconeConfigured(): boolean {
  const { apiKey, indexName } = getPineconeEnv();
  return Boolean(apiKey && indexName);
}

/**
 * Get index statistics
 */
export async function getIndexStats() {
  try {
    const index = getPineconeIndex();
    return await index.describeIndexStats();
  } catch (error) {
    console.error('Error getting index stats:', error);
    return null;
  }
}

/**
 * Namespace for math questions
 */
export const RAG_NAMESPACE = 'math-questions';

/**
 * Batch size limit for Pinecone upserts with vectors
 */
export const BATCH_SIZE = 100;

/**
 * Vector record format for Pinecone upsert
 */
export interface VectorRecord {
  id: string;
  values: number[];
  metadata: Record<string, string | number | string[]>;
}

/**
 * Convert RAGQuestion to VectorRecord for upsert
 */
export function questionToVectorRecord(question: RAGQuestion, embedding: number[]): VectorRecord {
  return {
    id: question.id,
    values: embedding,
    metadata: {
      gradeLevel: question.gradeLevel,
      topic: question.topic,
      subtopic: question.subtopic,
      difficulty: question.difficulty,
      questionText: question.questionText,
      answer: question.answer,
      ...(question.workingSolution && { workingSolution: question.workingSolution }),
      ...(question.visualHint && { visualHint: question.visualHint }),
      source: question.source,
      skillsTested: question.skillsTested.join(','),
    },
  };
}

/**
 * Upsert vector records to Pinecone in batches
 */
export async function upsertVectorsInBatches(
  records: VectorRecord[],
  namespace: string = RAG_NAMESPACE
): Promise<{ success: number; failed: number; errors: string[] }> {
  const index = getPineconeIndex();
  let success = 0;
  let failed = 0;
  const errors: string[] = [];

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);

    try {
      await index.namespace(namespace).upsert(batch);
      success += batch.length;
      console.log(`Upserted batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(records.length / BATCH_SIZE)} (${batch.length} records)`);
    } catch (error) {
      failed += batch.length;
      const errorMsg = error instanceof Error ? error.message : String(error);
      errors.push(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${errorMsg}`);
      console.error(`Error upserting batch:`, errorMsg);
    }
  }

  return { success, failed, errors };
}

/**
 * Query Pinecone by vector for similar questions
 */
export async function queryByVector(
  vector: number[],
  topK: number = 5,
  namespace: string = RAG_NAMESPACE,
  filter?: PineconeFilter
): Promise<ScoredPineconeRecord[]> {
  const index = getPineconeIndex();

  try {
    const queryResult = await index.namespace(namespace).query({
      vector,
      topK,
      includeMetadata: true,
      ...(filter && { filter }),
    });
    return queryResult.matches || [];
  } catch (error) {
    console.error('Error querying Pinecone:', error);
    return [];
  }
}

/**
 * Delete all records in a namespace
 */
export async function deleteAllRecords(namespace: string = RAG_NAMESPACE): Promise<boolean> {
  try {
    const index = getPineconeIndex();
    await index.namespace(namespace).deleteAll();
    return true;
  } catch (error) {
    console.error(`Error deleting all records in namespace ${namespace}:`, error);
    return false;
  }
}

/**
 * Pinecone metadata filter type
 */
export type PineconeFilter = Record<string, { $eq: string }>;

/**
 * Build filter object for Pinecone queries
 */
export function buildFilter(filters: {
  gradeLevel?: string;
  topic?: string;
  difficulty?: string;
}): PineconeFilter | undefined {
  const conditions: PineconeFilter = {};

  if (filters.gradeLevel) {
    conditions.gradeLevel = { $eq: filters.gradeLevel };
  }

  if (filters.topic) {
    conditions.topic = { $eq: filters.topic };
  }

  if (filters.difficulty) {
    conditions.difficulty = { $eq: filters.difficulty };
  }

  return Object.keys(conditions).length > 0 ? conditions : undefined;
}
