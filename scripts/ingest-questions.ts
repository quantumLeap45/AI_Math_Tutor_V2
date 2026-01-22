/**
 * Question Ingestion Script
 * AI Math Tutor v2
 *
 * Parses markdown question files and uploads them to Pinecone.
 * Uses OpenAI embeddings for vector generation.
 *
 * Usage:
 *   npx tsx scripts/ingest-questions.ts
 *
 * Options:
 *   --delete-first  - Delete all existing records before uploading
 *   --verify-only   - Only parse and verify, don't upload
 *   --file <name>   - Process only specific file
 */

import { config } from 'dotenv';
import { readFileSync, readdirSync } from 'fs';
import { join, resolve } from 'path';
import { parseAllMarkdownFiles, toPineconeRecords } from '../src/lib/rag/parser';
import {
  upsertVectorsInBatches,
  getIndexStats,
  deleteAllRecords,
  RAG_NAMESPACE,
  isPineconeConfigured,
  questionToVectorRecord,
} from '../src/lib/rag/pinecone';
import { generateBatchEmbeddings, createSearchableText } from '../src/lib/rag/embeddings';

// Load environment variables from .env.local
const envPath = resolve(__dirname, '../.env.local');
config({ path: envPath });

// Configuration
const QUESTIONS_DIR = join(__dirname, '../src/data/questions');

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  return {
    deleteFirst: args.includes('--delete-first'),
    verifyOnly: args.includes('--verify-only'),
    fileArg: args.includes('--file') ? args[args.indexOf('--file') + 1] : null,
  };
}

/**
 * Verify parsed questions
 */
function verifyQuestions(questions: any[]) {
  console.log('\n=== Verification Report ===');

  let errors = 0;
  let warnings = 0;

  for (const q of questions) {
    // Check required fields
    if (!q.id) {
      console.error(`ERROR: Question missing ID: ${q.questionText?.substring(0, 50)}...`);
      errors++;
    }
    if (!q.questionText) {
      console.error(`ERROR: Question ${q.id} missing questionText`);
      errors++;
    }
    if (!q.answer) {
      console.error(`ERROR: Question ${q.id} missing answer`);
      errors++;
    }
    if (!q.topic) {
      console.warn(`WARNING: Question ${q.id} missing topic`);
      warnings++;
    }
  }

  console.log(`\nTotal questions: ${questions.length}`);
  console.log(`Errors: ${errors}`);
  console.log(`Warnings: ${warnings}`);

  // Summary by grade
  const byGrade: Record<string, number> = {};
  const byTopic: Record<string, number> = {};
  const byDifficulty: Record<string, number> = {};

  for (const q of questions) {
    byGrade[q.gradeLevel] = (byGrade[q.gradeLevel] || 0) + 1;
    byTopic[q.topic] = (byTopic[q.topic] || 0) + 1;
    byDifficulty[q.difficulty] = (byDifficulty[q.difficulty] || 0) + 1;
  }

  console.log('\n=== By Grade Level ===');
  for (const [grade, count] of Object.entries(byGrade)) {
    console.log(`  ${grade}: ${count}`);
  }

  console.log('\n=== By Topic ===');
  for (const [topic, count] of Object.entries(byTopic)) {
    console.log(`  ${topic}: ${count}`);
  }

  console.log('\n=== By Difficulty ===');
  for (const [diff, count] of Object.entries(byDifficulty)) {
    console.log(`  ${diff}: ${count}`);
  }

  return errors === 0;
}

/**
 * List available files
 */
function listAvailableFiles() {
  const files = readdirSync(QUESTIONS_DIR).filter(f => f.endsWith('.md'));
  console.log('\n=== Available Question Files ===');
  files.forEach(f => console.log(`  - ${f}`));
  return files;
}

/**
 * Main ingestion function
 */
async function main() {
  console.log('=== AI Math Tutor v2 - Question Ingestion ===\n');

  const args = parseArgs();

  // Check configuration
  console.log('Checking Pinecone configuration...');
  if (!isPineconeConfigured()) {
    console.error('ERROR: PINECONE_API_KEY not configured. Please check your .env.local file.');
    process.exit(1);
  }
  console.log('✓ Pinecone configured');

  console.log('Checking OpenAI configuration...');
  if (!process.env.OPENAI_API_KEY) {
    console.error('ERROR: OPENAI_API_KEY not configured. Please check your .env.local file.');
    process.exit(1);
  }
  console.log('✓ OpenAI configured\n');

  // List available files
  const availableFiles = listAvailableFiles();

  // Check if specific file requested
  if (args.fileArg) {
    const targetFile = availableFiles.find(f => f.includes(args.fileArg!));
    if (!targetFile) {
      console.error(`ERROR: File matching "${args.fileArg}" not found.`);
      console.log('Available files:', availableFiles);
      process.exit(1);
    }
    console.log(`\nProcessing specific file: ${targetFile}`);
  }

  // Parse questions
  console.log('\n=== Parsing Question Files ===');
  let questions;

  if (args.fileArg) {
    // Parse single file
    const targetFile = availableFiles.find(f => f.includes(args.fileArg!))!;
    const filePath = join(QUESTIONS_DIR, targetFile);
    const content = readFileSync(filePath, 'utf-8');

    // Extract metadata from filename
    const gradeMatch = targetFile.match(/^(P[1-6])/i);
    const gradeLevel = gradeMatch ? gradeMatch[1].toUpperCase() : 'P1';

    const sourceMatch = targetFile.match(/^P[1-6]_(.+?)_\d{4}/i);
    const source = sourceMatch
      ? sourceMatch[1].replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim()
      : targetFile.replace('.md', '');

    const yearMatch = targetFile.match(/(\d{4})/);
    const year = yearMatch ? yearMatch[1] : undefined;

    const metadata = {
      filename: targetFile,
      gradeLevel: gradeLevel as any,
      source,
      year,
    };

    const { parseMarkdownFile } = require('../src/lib/rag/parser');
    questions = parseMarkdownFile(content, metadata);
  } else {
    // Parse all files
    questions = parseAllMarkdownFiles(QUESTIONS_DIR);
  }

  if (questions.length === 0) {
    console.error('ERROR: No questions found in files.');
    process.exit(1);
  }

  // Verify parsed questions
  const isValid = verifyQuestions(questions);
  if (!isValid) {
    console.error('\nERROR: Verification failed. Please fix the issues above.');
    process.exit(1);
  }

  // Stop here if verify-only mode
  if (args.verifyOnly) {
    console.log('\n✓ Verification complete. No errors found.');
    console.log('To upload to Pinecone, run without --verify-only flag.');
    process.exit(0);
  }

  // Get current index stats
  console.log('\n=== Current Index Stats ===');
  const statsBefore = await getIndexStats();
  if (statsBefore) {
    const nsStats = statsBefore.namespaces?.[RAG_NAMESPACE];
    console.log(`  Total records in namespace: ${nsStats?.recordCount || 0}`);
  }

  // Delete existing records if requested
  if (args.deleteFirst) {
    console.log('\n=== Deleting Existing Records ===');
    console.log('Deleting all records in namespace:', RAG_NAMESPACE);
    const deleted = await deleteAllRecords(RAG_NAMESPACE);
    if (deleted) {
      console.log('✓ Existing records deleted');
    } else {
      console.error('WARNING: Failed to delete existing records');
    }
    // Wait for deletion to propagate
    console.log('Waiting 10 seconds for deletion to propagate...');
    await new Promise(resolve => setTimeout(resolve, 10000));
  }

  // Generate embeddings for all questions
  console.log('\n=== Generating OpenAI Embeddings ===');
  console.log(`Generating embeddings for ${questions.length} questions...`);

  // Create searchable text for each question
  const searchableTexts = questions.map((q: any) => createSearchableText(q));

  // Generate embeddings in batch
  const embeddings = await generateBatchEmbeddings(searchableTexts);

  if (embeddings.length !== questions.length) {
    console.error('ERROR: Embedding count mismatch!');
    process.exit(1);
  }

  console.log(`✓ Generated ${embeddings.length} embeddings`);

  // Convert to VectorRecords
  console.log('\n=== Converting to Vector Records ===');
  const vectorRecords = questions.map((q: any, i: number) => questionToVectorRecord(q, embeddings[i]));
  console.log(`✓ Converted ${vectorRecords.length} questions to vector records`);

  // Upload to Pinecone
  console.log('\n=== Uploading to Pinecone ===');
  console.log(`Index: ${process.env.PINECONE_INDEX_NAME}`);
  console.log(`Namespace: ${RAG_NAMESPACE}`);
  console.log(`Records to upload: ${vectorRecords.length}`);

  const result = await upsertVectorsInBatches(vectorRecords, RAG_NAMESPACE);

  console.log('\n=== Upload Results ===');
  console.log(`✓ Successfully uploaded: ${result.success}`);
  if (result.failed > 0) {
    console.log(`✗ Failed: ${result.failed}`);
  }
  if (result.errors.length > 0) {
    console.log('\nErrors:');
    result.errors.forEach(e => console.log(`  - ${e}`));
  }

  // Wait for indexing
  console.log('\n=== Waiting for Indexing ===');
  console.log('Pinecone takes 10-20 seconds to index new records.');
  console.log('Waiting 15 seconds...');

  for (let i = 1; i <= 3; i++) {
    await new Promise(resolve => setTimeout(resolve, 5000));
    console.log(`  ${i * 5}s...`);
  }

  // Get final stats
  console.log('\n=== Final Index Stats ===');
  const statsAfter = await getIndexStats();
  if (statsAfter) {
    const nsStats = statsAfter.namespaces?.[RAG_NAMESPACE];
    console.log(`  Total records in namespace: ${nsStats?.recordCount || 0}`);
  }

  console.log('\n✓ Ingestion complete!');
}

// Run the script
main().catch(error => {
  console.error('\nERROR:', error);
  process.exit(1);
});
