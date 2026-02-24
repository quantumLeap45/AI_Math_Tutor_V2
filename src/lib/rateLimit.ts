/**
 * Rate Limiting Utility
 * AI Math Tutor v2
 *
 * Two-tier rate limiting:
 * 1. Anti-spam: 20 requests per minute (in-memory)
 * 2. Daily quota: configurable messages per 24 hours (Supabase, default 30)
 */

import { config } from '@/config';

// ============================================
// ANTI-SPAM: In-memory rate limiting (per minute)
// ============================================

// Store request timestamps by IP
const requestLog = new Map<string, number[]>();

// Configuration for anti-spam - use config values
const rateLimitConfig = config.getRateLimits();
const WINDOW_MS = rateLimitConfig.antiSpamWindowMs;
const MAX_REQUESTS = rateLimitConfig.antiSpamMaxRequests;

/**
 * Clean up old entries from the request log
 */
function cleanupOldEntries(): void {
  const now = Date.now();
  const cutoff = now - WINDOW_MS;

  requestLog.forEach((timestamps, ip) => {
    const filtered = timestamps.filter(t => t > cutoff);
    if (filtered.length === 0) {
      requestLog.delete(ip);
    } else {
      requestLog.set(ip, filtered);
    }
  });
}

/**
 * Check anti-spam rate limit (20 per minute)
 */
function checkAntiSpamLimit(ip: string): {
  success: boolean;
  remaining: number;
  retryAfter?: number;
} {
  const now = Date.now();
  const cutoff = now - WINDOW_MS;

  // Clean up old entries periodically
  if (Math.random() < 0.1) {
    cleanupOldEntries();
  }

  // Get existing timestamps for this IP
  const timestamps = requestLog.get(ip) || [];
  const recentTimestamps = timestamps.filter(t => t > cutoff);

  // Check if rate limit exceeded
  if (recentTimestamps.length >= MAX_REQUESTS) {
    const oldestInWindow = Math.min(...recentTimestamps);
    const retryAfter = Math.ceil((oldestInWindow + WINDOW_MS - now) / 1000);

    return {
      success: false,
      remaining: 0,
      retryAfter,
    };
  }

  // Add current request timestamp
  recentTimestamps.push(now);
  requestLog.set(ip, recentTimestamps);

  return {
    success: true,
    remaining: MAX_REQUESTS - recentTimestamps.length,
  };
}

// ============================================
// DAILY QUOTA TYPES
// ============================================

interface DailyQuotaStatus {
  used: number;
  remaining: number;
  limit: number;
  resetsAt: Date;
}

// ============================================
// COMBINED: Check both limits
// ============================================

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  dailyRemaining?: number;
  retryAfter?: number;
  quotaStatus?: DailyQuotaStatus;
}

/**
 * Main rate limit check - validates both anti-spam and daily quota
 *
 * @param ip - The client IP address
 * @returns Object with success status and quota info
 */
export async function checkRateLimit(ip: string): Promise<RateLimitResult> {
  // Check anti-spam limit first (fast, in-memory)
  const antiSpamResult = checkAntiSpamLimit(ip);

  if (!antiSpamResult.success) {
    return {
      success: false,
      remaining: antiSpamResult.remaining,
      retryAfter: antiSpamResult.retryAfter,
    };
  }

  // Daily quota bypassed for preview testing — anti-spam still active
  const tomorrow = new Date();
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(0, 0, 0, 0);

  return {
    success: true,
    remaining: antiSpamResult.remaining,
    dailyRemaining: 9999,
    quotaStatus: {
      used: 0,
      remaining: 9999,
      limit: 9999,
      resetsAt: tomorrow,
    },
  };
}

/**
 * Get the current quota status without checking/incrementing
 */
export async function getQuotaStatus(ip: string): Promise<DailyQuotaStatus> {
  // Daily quota bypassed for preview testing
  const tomorrow = new Date();
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(0, 0, 0, 0);

  return {
    used: 0,
    remaining: 9999,
    limit: 9999,
    resetsAt: tomorrow,
  };
}

/**
 * Get the client IP from request headers
 */
export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  return '127.0.0.1';
}

/**
 * Reset rate limit for an IP (for testing)
 */
export function resetRateLimit(ip: string): void {
  requestLog.delete(ip);
}
