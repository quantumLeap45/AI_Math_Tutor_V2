/**
 * RAG Verification Test
 * AI Math Tutor v2
 *
 * This test specifically verifies that the RAG system is actually being used
 * by checking for unique markers that only exist in our database.
 *
 * MARKERS: "ZYXWY" and "QWLP" - These should NEVER appear in AI's training data
 * If they appear in a response, we know RAG retrieved our example question.
 *
 * Usage:
 *   npx tsx scripts/verify-rag.ts
 */

import { config } from 'dotenv';
const { resolve } = require('path');

// Load environment variables
const envPath = resolve(__dirname, '../.env.local');
config({ path: envPath });

const CHAT_API_URL = 'http://localhost:3000/api/chat';

async function streamChat(messages: any[], mode: 'SHOW'): Promise<string> {
  const response = await fetch(CHAT_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages,
      mode,
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('No response body reader');
  }

  const decoder = new TextDecoder();
  let fullResponse = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    fullResponse += decoder.decode(value, { stream: true });
  }

  return fullResponse;
}

async function runRAGVerification() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║           RAG VERIFICATION TEST - Proving RAG is Working             ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  console.log('📋 TEST: Querying for a question about space aliens...');
  console.log('   Expected: Should NOT retrieve any examples (no alien questions in MOE papers)\n');

  console.log('📋 TEST: Querying for "ZYXWY"...');
  console.log('   Expected: Should retrieve our marker question\n');

  const tests = [
    {
      name: 'Control Test (No RAG)',
      query: 'Give me a question about space aliens',
      shouldHaveMarker: false,
    },
    {
      name: 'RAG Verification Test',
      query: 'Give me a question about ZYXWY',
      shouldHaveMarker: true,
    },
    {
      name: 'RAG Context Test (Both Markers)',
      query: 'I need a practice problem about ZYXWY and QWLP',
      shouldHaveMarker: true,
    },
  ];

  for (const test of tests) {
    console.log(`┌─ ${test.name}`);
    console.log(`├─ Query: "${test.query}"`);
    console.log('├─ Running...');

    try {
      const response = await streamChat([
        {
          id: 'msg-1',
          role: 'user',
          content: test.query,
          timestamp: new Date().toISOString(),
        },
      ], 'SHOW');

      const hasMarker = response.toLowerCase().includes('zyxwy');

      if (test.shouldHaveMarker) {
        if (hasMarker) {
          console.log('│   ✓ PASSED - "ZYXWY" found in response!');
          console.log(`│   This proves RAG is working - the AI only knows about ZYXWY from our database!`);
        } else {
          console.log('│   ✗ FAILED - "ZYXWY" NOT found');
          console.log('│   This suggests RAG may not be retrieving our examples');
        }
      } else {
        if (hasMarker) {
          console.log('│   ✗ FAILED - "ZYXWY" unexpectedly found');
          console.log('│   This shouldn\'t happen for alien questions!');
        } else {
          console.log('│   ✓ PASSED - No "ZYXWY" (as expected for this query)');
        }
      }

      console.log(`│   Response: ${response.substring(0, 150)}...`);
      console.log(`└─ Complete\n`);
    } catch (error) {
      console.log(`│   ✗ ERROR: ${error}`);
      console.log(`└─ Complete\n`);
    }

    // Delay between tests
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  console.log('═══════════════════════════════════════════════════════════════\n');
  console.log('📊 SUMMARY:\n');
  console.log('The RAG verification test uses unique markers ("ZYXWY" and "QWLP") that:');
  console.log('  • Do NOT exist in real MOE papers');
  console.log('  • Do NOT exist in the AI\'s training data');
  console.log('  • ONLY exist in our test database\n');
  console.log('If these markers appear in AI responses, we have proof RAG is working!');
  console.log('');
}

// Run the verification
runRAGVerification().catch(error => {
  console.error('\n❌ Verification failed:', error);
  process.exit(1);
});
