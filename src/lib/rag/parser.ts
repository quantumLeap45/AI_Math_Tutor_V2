/**
 * Markdown Question Parser
 * AI Math Tutor v2
 *
 * Parses pre-cleaned markdown files containing math questions
 * and converts them to structured RAGQuestion objects.
 */

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import {
  RAGQuestion,
  PineconeQuestionRecord,
  GradeLevel,
  Difficulty,
  MarkdownFileMetadata,
} from './types';

/**
 * Extract metadata from filename
 * Filename format: P{1-6}_{SchoolNames}_{Year}.md
 */
function parseFilenameMetadata(filename: string): MarkdownFileMetadata {
  const baseName = filename.replace('.md', '');

  // Extract grade level (P1, P2, etc.)
  const gradeMatch = baseName.match(/^(P[1-6])/i);
  const gradeLevel = (gradeMatch ? gradeMatch[1].toUpperCase() : 'P1') as GradeLevel;

  // Extract source (everything between grade and year)
  const sourceMatch = baseName.match(/^P[1-6]_(.+?)_\d{4}$/i);
  const source = sourceMatch
    ? sourceMatch[1].replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim()
    : baseName;

  // Extract year
  const yearMatch = baseName.match(/(\d{4})$/);
  const year = yearMatch ? yearMatch[1] : undefined;

  return { filename, gradeLevel, source, year };
}

/**
 * Clean visual hint text - remove "None needed" and trim
 */
function cleanVisualHint(hint: string): string | undefined {
  const cleaned = hint.trim();
  if (cleaned === 'None needed' || cleaned === 'None' || cleaned === 'N/A') {
    return undefined;
  }
  return cleaned || undefined;
}

/**
 * Parse difficulty string to typed Difficulty
 */
function parseDifficulty(diff: string): Difficulty {
  const normalized = diff.toLowerCase().trim();
  if (normalized.startsWith('easy')) return 'Easy';
  if (normalized.startsWith('medium')) return 'Medium';
  if (normalized.startsWith('hard')) return 'Hard';
  return 'Easy'; // Default
}

/**
 * Extract field value from markdown line
 * Format: - **Field:** value
 */
function extractField(content: string, fieldName: string): string | undefined {
  const regex = new RegExp(`-\\s*\\*\\*${fieldName}:\\*\\*\\s*(.+?)(?:\\n|$)`, 'i');
  const match = content.match(regex);
  return match ? match[1].trim() : undefined;
}

/**
 * Parse a single question block
 */
function parseQuestionBlock(
  block: string,
  questionNumber: number,
  metadata: MarkdownFileMetadata
): RAGQuestion | null {
  // Extract all fields using the extractField function
  const topic = extractField(block, 'Topic') || 'Unknown';
  const subtopic = extractField(block, 'Subtopic') || 'General';
  const difficultyStr = extractField(block, 'Difficulty') || 'Easy';
  const questionText = extractField(block, 'Question') || '';
  const visualHintRaw = extractField(block, 'Visual_Hint') || '';
  const answer = extractField(block, 'Answer') || '';
  const working = extractField(block, 'Working');
  const skillsStr = extractField(block, 'Skills');
  const options = extractField(block, 'Options');

  // Validate required fields
  if (!questionText || !answer) {
    console.warn(`Skipping question ${questionNumber} - missing question or answer`);
    return null;
  }

  // Generate ID: {GradeLevel}-{SourceCode}-{Number}
  const sourceCode = metadata.source
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 6);
  const id = `${metadata.gradeLevel}-${sourceCode}-${String(questionNumber).padStart(3, '0')}`;

  // Parse skills into array
  const skillsTested = skillsStr
    ? skillsStr.split(',').map(s => s.trim()).filter(Boolean)
    : [];

  return {
    id,
    questionText,
    gradeLevel: metadata.gradeLevel,
    topic,
    subtopic,
    difficulty: parseDifficulty(difficultyStr),
    answer,
    workingSolution: working,
    visualHint: cleanVisualHint(visualHintRaw),
    source: metadata.source + (metadata.year ? ` ${metadata.year}` : ''),
    skillsTested,
    options,
  };
}

/**
 * Parse entire markdown file content
 */
export function parseMarkdownFile(content: string, metadata: MarkdownFileMetadata): RAGQuestion[] {
  const questions: RAGQuestion[] = [];

  // Split by "### Question" to find all question blocks
  const questionBlocks = content.split(/### Question\s+/i).filter(Boolean);

  for (let i = 0; i < questionBlocks.length; i++) {
    const block = questionBlocks[i];
    // Extract question number from the block header (first line)
    const numberMatch = block.match(/^(\d+[a-z]?)/);
    const questionNumber = numberMatch ? parseInt(numberMatch[1].replace(/\D/g, '')) : i + 1;

    const question = parseQuestionBlock(block, questionNumber, metadata);
    if (question) {
      questions.push(question);
    }
  }

  return questions;
}

/**
 * Parse all markdown files in a directory
 */
export function parseAllMarkdownFiles(dirPath: string): RAGQuestion[] {
  const allQuestions: RAGQuestion[] = [];
  const files = readdirSync(dirPath);

  for (const file of files) {
    if (!file.endsWith('.md')) continue;

    const filePath = join(dirPath, file);
    const metadata = parseFilenameMetadata(file);
    const content = readFileSync(filePath, 'utf-8');

    console.log(`Parsing ${file}...`);
    const questions = parseMarkdownFile(content, metadata);
    console.log(`  Found ${questions.length} questions`);

    allQuestions.push(...questions);
  }

  return allQuestions;
}

/**
 * Convert RAGQuestion to Pinecone record format
 */
export function toPineconeRecord(question: RAGQuestion): PineconeQuestionRecord {
  // Create searchable text: grade + topic + subtopic + question
  const searchableText = `${question.gradeLevel} ${question.topic} ${question.subtopic} ${question.questionText}`;

  return {
    _id: question.id,
    text: searchableText,
    gradeLevel: question.gradeLevel,
    topic: question.topic,
    subtopic: question.subtopic,
    difficulty: question.difficulty,
    questionText: question.questionText,
    answer: question.answer,
    workingSolution: question.workingSolution,
    visualHint: question.visualHint,
    source: question.source,
    skillsTested: question.skillsTested,
  };
}

/**
 * Batch convert questions to Pinecone records
 */
export function toPineconeRecords(questions: RAGQuestion[]): PineconeQuestionRecord[] {
  return questions.map(toPineconeRecord);
}
