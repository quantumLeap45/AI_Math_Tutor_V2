/**
 * Pinecone Client
 * AI Math Tutor v2
 *
 * Handles connection to Pinecone vector database for RAG system.
 * Uses OpenAI embeddings with traditional vector upsert and query.
 */

import { Pinecone, PineconeRecord } from '@pinecone-database/pinecone';
import { RAGQuestion } from './types';

// Get environment variables dynamically (for scripts that use dotenv)
const getPineconeEnv = () => ({
  apiKey: process.env.PINECONE_API_KEY,
  indexName: process.env.PINECONE_INDEX_NAME || 'ai-math-tutor-v2',
  indexHost: process.env.PINECONE_INDEX_HOST,
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
  filter?: Record<string, any>
): Promise<PineconeRecord[]> {
  const index = getPineconeIndex();

  try {
    const queryOptions: any = {
      vector,
      topK,
      includeMetadata: true,
    };

    if (filter) {
      queryOptions.filter = filter;
    }

    const queryResult = await index.namespace(namespace).query(queryOptions);
    return queryResult.matches || [];
  } catch (error) {
    console.error('Error querying Pinecone:', error);
    return [];
  }
}

/**
 * Delete a record from Pinecone
 */
export async function deleteRecord(id: string, namespace: string = RAG_NAMESPACE): Promise<boolean> {
  try {
    const index = getPineconeIndex();
    await index.namespace(namespace).deleteOne(id);
    return true;
  } catch (error) {
    console.error(`Error deleting record ${id}:`, error);
    return false;
  }
}

/**
 * Delete multiple records from Pinecone
 */
export async function deleteMany(ids: string[], namespace: string = RAG_NAMESPACE): Promise<boolean> {
  try {
    const index = getPineconeIndex();
    await index.namespace(namespace).deleteMany(ids);
    return true;
  } catch (error) {
    console.error(`Error deleting records:`, error);
    return false;
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
 * Fetch a specific record by ID
 */
export async function fetchRecord(id: string, namespace: string = RAG_NAMESPACE) {
  try {
    const index = getPineconeIndex();
    const result = await index.namespace(namespace).fetch([id]);

    if (result.records && result.records[id]) {
      const record = result.records[id];
      return {
        id: record.id,
        vector: record.values,
        metadata: record.metadata,
      };
    }

    return null;
  } catch (error) {
    console.error(`Error fetching record ${id}:`, error);
    return null;
  }
}

/**
 * List all record IDs in a namespace (paginated)
 */
export async function listAllRecordIds(namespace: string = RAG_NAMESPACE): Promise<string[]> {
  const allIds: string[] = [];
  let paginationToken: string | undefined;

  try {
    const index = getPineconeIndex();

    while (true) {
      const result = await index.namespace(namespace).listPaginated({
        limit: 99, // Pinecone requires limit < 100
        paginationToken,
      });

      if (result.vectors) {
        allIds.push(...result.vectors.map((v: any) => v.id));
      }

      if (!result.pagination || !result.pagination.next) {
        break;
      }

      paginationToken = result.pagination.next;
    }
  } catch (error) {
    console.error('Error listing record IDs:', error);
  }

  return allIds;
}

/**
 * Build filter object for Pinecone queries
 */
export function buildFilter(filters: {
  gradeLevel?: string;
  topic?: string;
  difficulty?: string;
}): Record<string, any> | undefined {
  const conditions: Record<string, any> = {};

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
