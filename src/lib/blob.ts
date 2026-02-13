/**
 * Vercel Blob Storage Utilities
 * AI Math Tutor v2
 *
 * Upload, delete, and list quiz question images stored in Vercel Blob.
 */

import { put, del, list } from '@vercel/blob';
import { config } from '@/config';
import { AppError, ErrorCode } from '@/lib/errors';

/** Maximum file size for quiz images (5MB) */
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

/** Allowed MIME types for quiz images */
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
];

/** Path prefix for quiz images in blob storage */
const QUIZ_IMAGE_PREFIX = 'quiz-images';

/**
 * Validate that a file is a valid quiz image
 */
export function validateQuizImage(file: File | Blob, filename?: string): { valid: boolean; error?: string } {
  if (file.size > MAX_IMAGE_SIZE) {
    return { valid: false, error: `Image too large. Maximum size is ${MAX_IMAGE_SIZE / (1024 * 1024)}MB.` };
  }

  if (file.type && !ALLOWED_MIME_TYPES.includes(file.type)) {
    return { valid: false, error: `Invalid image format. Allowed: JPEG, PNG, GIF, WebP.` };
  }

  return { valid: true };
}

/**
 * Upload a quiz question image to Vercel Blob
 */
export async function uploadQuizImage(
  file: File | Blob,
  questionId: string,
  filename?: string
): Promise<{ url: string; pathname: string }> {
  if (!config.isBlobConfigured()) {
    throw new AppError(
      ErrorCode.BLOB_NOT_CONFIGURED,
      'Vercel Blob is not configured',
      'Image upload is not available. Please configure BLOB_READ_WRITE_TOKEN.',
      500,
      false
    );
  }

  const validation = validateQuizImage(file, filename);
  if (!validation.valid) {
    throw new AppError(
      ErrorCode.INVALID_INPUT,
      `Image validation failed: ${validation.error}`,
      validation.error || 'Invalid image file.',
      400,
      false
    );
  }

  // Build the blob path: quiz-images/{questionId}/{filename}
  const ext = filename?.split('.').pop() || 'png';
  const blobPath = `${QUIZ_IMAGE_PREFIX}/${questionId}.${ext}`;

  try {
    const blob = await put(blobPath, file, {
      access: 'public',
      token: config.getBlob().token,
    });

    return {
      url: blob.url,
      pathname: blob.pathname,
    };
  } catch (error) {
    console.error('Blob upload failed:', error);
    throw new AppError(
      ErrorCode.BLOB_UPLOAD_FAILED,
      `Failed to upload image: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'Failed to upload image. Please try again.',
      500,
      true
    );
  }
}

/**
 * Delete a quiz question image from Vercel Blob
 */
export async function deleteQuizImage(url: string): Promise<void> {
  if (!config.isBlobConfigured()) {
    throw new AppError(
      ErrorCode.BLOB_NOT_CONFIGURED,
      'Vercel Blob is not configured',
      'Image deletion is not available.',
      500,
      false
    );
  }

  try {
    await del(url, { token: config.getBlob().token });
  } catch (error) {
    console.error('Blob delete failed:', error);
    throw new AppError(
      ErrorCode.BLOB_DELETE_FAILED,
      `Failed to delete image: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'Failed to delete image. Please try again.',
      500,
      true
    );
  }
}

/**
 * List all quiz images in Vercel Blob
 */
export async function listQuizImages(): Promise<Array<{ url: string; pathname: string; size: number; uploadedAt: Date }>> {
  if (!config.isBlobConfigured()) {
    return [];
  }

  try {
    const result = await list({
      prefix: QUIZ_IMAGE_PREFIX,
      token: config.getBlob().token,
    });

    return result.blobs.map((blob) => ({
      url: blob.url,
      pathname: blob.pathname,
      size: blob.size,
      uploadedAt: blob.uploadedAt,
    }));
  } catch (error) {
    console.error('Blob list failed:', error);
    return [];
  }
}
