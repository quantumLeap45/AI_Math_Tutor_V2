/**
 * Quiz Image Upload API Route (v1)
 * AI Math Tutor v2
 *
 * Handles uploading quiz question images to Vercel Blob storage.
 * Accepts multipart form data with an image file and question metadata.
 */

import { NextRequest, NextResponse } from 'next/server';
import { uploadQuizImage, validateQuizImage } from '@/lib/blob';
import { quizImageUploadSchema } from '@/lib/validation';
import { errorToResponse, ValidationError, QuotaError, RateLimitError } from '@/lib/errors';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { z } from 'zod';

export const runtime = 'nodejs';

/**
 * POST /api/v1/quiz/images/upload
 * Upload a quiz question image
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting (both anti-spam and daily quota)
    const ip = getClientIp(request);
    const rateLimitResult = await checkRateLimit(ip);

    if (!rateLimitResult.success) {
      if (rateLimitResult.quotaStatus && rateLimitResult.dailyRemaining !== undefined) {
        throw new QuotaError(rateLimitResult.quotaStatus.resetsAt);
      }
      throw new RateLimitError(rateLimitResult.retryAfter);
    }

    const formData = await request.formData();

    // Extract file
    const file = formData.get('file');
    if (!file || !(file instanceof Blob)) {
      throw new ValidationError('file', 'An image file is required.');
    }

    // Extract and validate metadata
    const questionId = formData.get('questionId')?.toString() || '';
    const alt = formData.get('alt')?.toString() || undefined;

    let validatedMeta;
    try {
      validatedMeta = quizImageUploadSchema.parse({ questionId, alt });
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstIssue = error.issues[0];
        throw new ValidationError(
          firstIssue?.path.join('.') || 'metadata',
          firstIssue?.message || 'Invalid upload metadata.'
        );
      }
      throw new ValidationError('metadata');
    }

    // Validate image file
    const validation = validateQuizImage(file);
    if (!validation.valid) {
      throw new ValidationError('file', validation.error);
    }

    // Get original filename from File object
    const filename = file instanceof File ? file.name : undefined;

    // Upload to Vercel Blob
    const result = await uploadQuizImage(file, validatedMeta.questionId, filename);

    return NextResponse.json({
      url: result.url,
      pathname: result.pathname,
      questionId: validatedMeta.questionId,
      alt: validatedMeta.alt,
    }, { status: 200 });
  } catch (error) {
    console.error('Quiz image upload API error:', error);
    return errorToResponse(error);
  }
}

/**
 * GET /api/v1/quiz/images/upload
 * Returns 405 - Method not allowed
 */
export async function GET() {
  return errorToResponse(
    new ValidationError('method', 'Method not allowed. Use POST.')
  );
}
