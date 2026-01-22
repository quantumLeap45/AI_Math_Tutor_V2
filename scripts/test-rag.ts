/**
 * RAG Test Script
 * AI Math Tutor v2
 *
 * Tests the RAG system functionality including:
 * - Pinecone connection
 * - Data parsing
 * - Search functionality
 * - Context formatting
 *
 * Usage:
 *   npx tsx scripts/test-rag.ts
 */

import { config } from 'dotenv';
import { getIndexStats, isPineconeConfigured, listAllRecordIds, RAG_NAMESPACE } from '../src/lib/rag/pinecone';
import { parseAllMarkdownFiles, toPineconeRecords } from '../src/lib/rag/parser';
import { searchQuestions, getRAGContext, detectUserIntent } from '../src/lib/rag/search';
import { join, resolve } from 'path';

// Load environment variables from .env.local
const envPath = resolve(__dirname, '../.env.local');
config({ path: envPath });

// Configuration
const QUESTIONS_DIR = join(__dirname, '../src/data/questions');

/**
 * Color codes for terminal output
 */
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function success(message: string) {
  log(`✓ ${message}`, 'green');
}

function error(message: string) {
  log(`✗ ${message}`, 'red');
}

function info(message: string) {
  log(`ℹ ${message}`, 'blue');
}

function section(title: string) {
  console.log(`\n${'='.repeat(50)}`);
  log(title, 'cyan');
  console.log('='.repeat(50));
}

/**
 * Test 1: Configuration Check
 */
async function testConfiguration() {
  section('TEST 1: Configuration Check');

  if (isPineconeConfigured()) {
    success('Pinecone is configured');
    info(`  Index: ${process.env.PINECONE_INDEX_NAME}`);
    info(`  Namespace: ${RAG_NAMESPACE}`);
    return true;
  } else {
    error('Pinecone is NOT configured');
    info('  Please check your .env.local file');
    return false;
  }
}

/**
 * Test 2: Pinecone Connection
 */
async function testPineconeConnection() {
  section('TEST 2: Pinecone Connection');

  try {
    const stats = await getIndexStats();

    if (!stats) {
      error('Could not get index stats');
      return false;
    }

    success('Connected to Pinecone');
    info(`  Total vector count: ${stats.totalRecordCount || 0}`);

    const nsStats = stats.namespaces?.[RAG_NAMESPACE];
    if (nsStats) {
      info(`  Records in "${RAG_NAMESPACE}": ${nsStats.recordCount || 0}`);
    } else {
      info(`  No records found in namespace "${RAG_NAMESPACE}"`);
    }

    return true;
  } catch (err) {
    error(`Failed to connect to Pinecone: ${err}`);
    return false;
  }
}

/**
 * Test 3: Data Parsing
 */
async function testDataParsing() {
  section('TEST 3: Data Parsing');

  try {
    const questions = parseAllMarkdownFiles(QUESTIONS_DIR);

    if (questions.length === 0) {
      error('No questions parsed');
      return false;
    }

    success(`Parsed ${questions.length} questions`);

    // Show sample question
    const sample = questions[0];
    info('\nSample question:');
    info(`  ID: ${sample.id}`);
    info(`  Grade: ${sample.gradeLevel}`);
    info(`  Topic: ${sample.topic} - ${sample.subtopic}`);
    info(`  Difficulty: ${sample.difficulty}`);
    info(`  Question: ${sample.questionText.substring(0, 60)}...`);
    info(`  Answer: ${sample.answer}`);

    // Check for required fields
    let missingFields = 0;
    for (const q of questions) {
      if (!q.id || !q.questionText || !q.answer) {
        missingFields++;
      }
    }

    if (missingFields > 0) {
      error(`${missingFields} questions missing required fields`);
      return false;
    }

    success('All questions have required fields');
    return true;
  } catch (err) {
    error(`Parsing failed: ${err}`);
    return false;
  }
}

/**
 * Test 4: Record Listing
 */
async function testRecordListing() {
  section('TEST 4: Record Listing');

  try {
    const ids = await listAllRecordIds(RAG_NAMESPACE);

    if (ids.length === 0) {
      info('No records found in Pinecone');
      info('  Run "npx tsx scripts/ingest-questions.ts" to upload questions');
      return false;
    }

    success(`Found ${ids.length} records in Pinecone`);

    // Show sample IDs
    info('\nSample record IDs:');
    ids.slice(0, 5).forEach(id => info(`  - ${id}`));

    return true;
  } catch (err) {
    error(`Failed to list records: ${err}`);
    return false;
  }
}

/**
 * Test 5: Intent Detection
 */
function testIntentDetection() {
  section('TEST 5: Intent Detection');

  const testQueries = [
    'Give me a P1 addition problem',
    'I need practice with subtraction',
    'What is 5 + 3?',
    'Can you help me with multiplication?',
  ];

  let passed = 0;

  for (const query of testQueries) {
    try {
      const intent = detectUserIntent(query);
      info(`\nQuery: "${query}"`);
      info(`  Wants questions: ${intent.wantsQuestions}`);
      info(`  Grade level: ${intent.gradeLevel || 'None'}`);
      info(`  Topic: ${intent.topic || 'None'}`);
      success('Intent detected');
      passed++;
    } catch (err) {
      error(`Failed: ${err}`);
    }
  }

  return passed === testQueries.length;
}

/**
 * Test 6: Search Functionality
 */
async function testSearch() {
  section('TEST 6: Search Functionality');

  const testSearches = [
    { query: 'P1 addition word problems', gradeLevel: 'P1' as const, topic: 'Addition' },
    { query: 'subtraction within 100', gradeLevel: undefined, topic: 'Subtraction' },
  ];

  for (const test of testSearches) {
    info(`\nSearching for: "${test.query}"`);

    try {
      const results = await searchQuestions(test.query, {
        gradeLevel: test.gradeLevel,
        topic: test.topic,
        maxResults: 3,
      });

      if (results.length === 0) {
        info('  No results found (may need to ingest data first)');
        continue;
      }

      success(`Found ${results.length} results`);

      for (const result of results.slice(0, 2)) {
        info(`\n  Result: ${result.id} (score: ${result.score.toFixed(3)})`);
        info(`    Question: ${result.question.questionText.substring(0, 50)}...`);
      }
    } catch (err) {
      error(`Search failed: ${err}`);
    }
  }

  return true;
}

/**
 * Test 7: RAG Context Formatting
 */
async function testRAGContext() {
  section('TEST 7: RAG Context Formatting');

  const testQuery = 'Give me a P1 addition word problem';

  info(`Testing query: "${testQuery}"\n`);

  try {
    const context = await getRAGContext(testQuery);

    if (context.count === 0) {
      info('No context retrieved (may need to ingest data first)');
      return true;
    }

    success(`Retrieved ${context.count} example questions`);

    // Show formatted context preview
    info('\nFormatted context preview (first 500 chars):');
    info(context.formattedContext.substring(0, 500) + '...');

    return true;
  } catch (err) {
    error(`RAG context failed: ${err}`);
    return false;
  }
}

/**
 * Main test runner
 */
async function runTests() {
  log('\n🧪 AI Math Tutor v2 - RAG System Tests\n', 'cyan');

  const results: { name: string; passed: boolean }[] = [];

  // Run all tests
  results.push({ name: 'Configuration Check', passed: await testConfiguration() });
  results.push({ name: 'Pinecone Connection', passed: await testPineconeConnection() });
  results.push({ name: 'Data Parsing', passed: await testDataParsing() });
  results.push({ name: 'Record Listing', passed: await testRecordListing() });
  results.push({ name: 'Intent Detection', passed: await testIntentDetection() });
  results.push({ name: 'Search Functionality', passed: await testSearch() });
  results.push({ name: 'RAG Context Formatting', passed: await testRAGContext() });

  // Summary
  section('SUMMARY');

  const passed = results.filter(r => r.passed).length;
  const total = results.length;

  for (const result of results) {
    if (result.passed) {
      success(result.name);
    } else {
      error(result.name);
    }
  }

  console.log('\n' + '='.repeat(50));

  if (passed === total) {
    log(`\n🎉 All tests passed! (${passed}/${total})`, 'green');
  } else {
    log(`\n⚠️  Some tests failed: ${passed}/${total} passed`, 'yellow');
  }

  console.log('');
}

// Run tests
runTests().catch(err => {
  error(`Test runner failed: ${err}`);
  process.exit(1);
});
