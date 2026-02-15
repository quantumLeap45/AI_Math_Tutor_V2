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
 *
 * Supports two filename formats:
 *   Format 1 (old): P{1-6}_{SchoolNames}_{Year}.md
 *     Example: P1_HenryPark_MahaBodhi_2022.md → grade P1, source "HenryPark MahaBodhi", year 2022
 *
 *   Format 2 (new): {Year}-P{1-6}-Maths-{ExamType}-{School}.md
 *     Example: 2024-P3-Maths-EndOfYearExam-Nanyang.md → grade P3, source "Nanyang", year 2024
 */
function parseFilenameMetadata(filename: string): MarkdownFileMetadata {
  const baseName = filename.replace('.md', '');

  // Try Format 2 first: {Year}-P{1-6}-Maths-{ExamType}-{School}
  const format2Match = baseName.match(
    /^(\d{4})-(P[1-6])-Maths-(.+)-([^-]+)$/i
  );
  if (format2Match) {
    const year = format2Match[1];
    const gradeLevel = format2Match[2].toUpperCase() as GradeLevel;
    const examType = format2Match[3].replace(/-/g, ' ');
    const school = format2Match[4];
    // Source combines school and exam type for richer context
    const source = `${school} ${examType}`;
    return { filename, gradeLevel, source, year };
  }

  // Format 1 (old): P{1-6}_{SchoolNames}_{Year}
  const gradeMatch = baseName.match(/^(P[1-6])/i);
  const gradeLevel = (gradeMatch ? gradeMatch[1].toUpperCase() : 'P1') as GradeLevel;

  const sourceMatch = baseName.match(/^P[1-6]_(.+?)_(\d{4})$/i);
  const source = sourceMatch
    ? sourceMatch[1].replace(/_/g, ' ')
    : baseName;

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
 * Extended RAGQuestion with DisableRAG flag.
 * Questions with DisableRAG: Yes are parsed but flagged
 * so the upload script can skip them during Pinecone upsert.
 */
export interface ParsedRAGQuestion extends RAGQuestion {
  disableRAG?: boolean;
}

/**
 * Parse a single question block
 */
function parseQuestionBlock(
  block: string,
  questionNumber: number,
  metadata: MarkdownFileMetadata
): ParsedRAGQuestion | null {
  // Extract all fields using the extractField function
  const topic = extractField(block, 'Topic') || 'Unknown';
  const subtopic = extractField(block, 'Subtopic') || 'General';
  const difficultyStr = extractField(block, 'Difficulty') || 'Easy';
  const questionText = extractField(block, 'QuestionText') || extractField(block, 'Question') || '';
  const visualHintRaw = extractField(block, 'Visual_Hint') || '';
  const answer = extractField(block, 'Answer') || '';
  const working = extractField(block, 'WorkingSolution') || extractField(block, 'Working');
  const skillsStr = extractField(block, 'Skills');
  const options = extractField(block, 'Options');

  // Extract visual fields (HasVisual, VisualFile, VisualAlt)
  const hasVisualRaw = extractField(block, 'HasVisual');
  const hasVisual = hasVisualRaw ? hasVisualRaw.toLowerCase() === 'yes' : false;
  const visualFile = extractField(block, 'VisualFile');
  const visualAlt = extractField(block, 'VisualAlt');

  // Extract DisableRAG flag — also check VisualCritical as a secondary indicator
  const disableRAGRaw = extractField(block, 'DisableRAG');
  const visualCriticalRaw = extractField(block, 'VisualCritical');
  const visualCritical = visualCriticalRaw ? visualCriticalRaw.toLowerCase().startsWith('yes') : false;
  const disableRAG = (disableRAGRaw ? disableRAGRaw.toLowerCase() === 'yes' : false) || visualCritical;

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
    hasVisual: hasVisual ? true : undefined,
    visualFile: visualFile || undefined,
    visualAlt: visualAlt || undefined,
    disableRAG: disableRAG || undefined,
  };
}

/**
 * Parse entire markdown file content
 */
export function parseMarkdownFile(content: string, metadata: MarkdownFileMetadata): ParsedRAGQuestion[] {
  const questions: ParsedRAGQuestion[] = [];

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
export function parseAllMarkdownFiles(dirPath: string): ParsedRAGQuestion[] {
  const allQuestions: ParsedRAGQuestion[] = [];
  const files = readdirSync(dirPath);

  for (const file of files) {
    if (!file.endsWith('.md')) continue;

    // Skip test marker and known non-production files
    if (file.includes('RAG_TEST_MARKER') || file.includes('_TEST_')) continue;

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
