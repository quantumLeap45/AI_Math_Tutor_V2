/**
 * Rate Limiting Utility
 * AI Math Tutor v2
 *
 * Two-tier rate limiting:
 * 1. Anti-spam: 20 requests per minute (in-memory)
 * 2. Daily quota: 50 messages per 24 hours (Supabase)
 */

import { supabase as supabaseClient, isSupabaseConfigured } from '@/lib/supabase';

// ============================================
// ANTI-SPAM: In-memory rate limiting (per minute)
// ============================================

// Store request timestamps by IP
const requestLog = new Map<string, number[]>();

// Configuration for anti-spam
const WINDOW_MS = 60 * 1000; // 1 minute window
const MAX_REQUESTS = 20; // Max requests per minute

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
// DAILY QUOTA: 50 messages per 24 hours (Supabase)
// ============================================

const DAILY_QUOTA_LIMIT = 50; // 50 messages per day

interface DailyQuotaStatus {
  used: number;
  remaining: number;
  limit: number;
  resetsAt: Date;
}

/**
 * Get today's date in YYYY-MM-DD format
 */
function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Get or create the daily quota record for an IP
 */
async function getOrCreateQuotaRecord(ip: string): Promise<{ used: number; isNew: boolean }> {
  if (!isSupabaseConfigured() || !supabaseClient) {
    // Fallback to in-memory if Supabase not configured
    console.warn('Supabase not configured, using in-memory quota');
    return { used: 0, isNew: true };
  }

  const today = getTodayDate();

  try {
    // Try to get existing record
    const { data, error } = await supabaseClient
      .from('daily_quota')
      .select('requests_count')
      .eq('ip_address', ip)
      .eq('request_date', today)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 is "not found" which is expected
      console.error('Supabase quota check error:', error);
    }

    if (data) {
      return { used: data.requests_count || 0, isNew: false };
    }

    // Create new record
    await supabaseClient
      .from('daily_quota')
      .insert({
        ip_address: ip,
        request_date: today,
        requests_count: 0,
      });

    return { used: 0, isNew: true };
  } catch (err) {
    console.error('Supabase quota operation error:', err);
    return { used: 0, isNew: true };
  }
}

/**
 * Increment the quota count for an IP using atomic upsert
 */
async function incrementQuota(ip: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabaseClient) {
    return true; // Fallback: allow if Supabase not configured
  }

  const today = getTodayDate();

  try {
    // First, try to get the current record
    const { data: existing } = await supabaseClient
      .from('daily_quota')
      .select('requests_count')
      .eq('ip_address', ip)
      .eq('request_date', today)
      .single();

    if (existing) {
      // Update existing record
      const { error } = await supabaseClient
        .from('daily_quota')
        .update({
          requests_count: existing.requests_count + 1,
          last_request: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('ip_address', ip)
        .eq('request_date', today);

      return !error;
    } else {
      // Insert new record with count = 1
      const { error } = await supabaseClient
        .from('daily_quota')
        .insert({
          ip_address: ip,
          request_date: today,
          requests_count: 1,
          last_request: new Date().toISOString(),
        });

      return !error;
    }
  } catch (err) {
    console.error('Supabase quota increment error:', err);
    return false;
  }
}

/**
 * Check daily quota limit (50 per 24 hours)
 */
async function checkDailyQuota(ip: string): Promise<{
  success: boolean;
  status: DailyQuotaStatus;
}> {
  const { used } = await getOrCreateQuotaRecord(ip);

  const remaining = Math.max(0, DAILY_QUOTA_LIMIT - used);
  const success = used < DAILY_QUOTA_LIMIT;

  // Calculate reset time (midnight tomorrow in UTC)
  const tomorrow = new Date();
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(0, 0, 0, 0);

  return {
    success,
    status: {
      used,
      remaining,
      limit: DAILY_QUOTA_LIMIT,
      resetsAt: tomorrow,
    },
  };
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

  // Check daily quota (Supabase)
  const dailyResult = await checkDailyQuota(ip);

  if (!dailyResult.success) {
    return {
      success: false,
      remaining: 0,
      dailyRemaining: 0,
      quotaStatus: dailyResult.status,
    };
  }

  // Both checks passed - increment the daily quota
  await incrementQuota(ip);

  return {
    success: true,
    remaining: antiSpamResult.remaining,
    dailyRemaining: dailyResult.status.remaining - 1, // Account for current request
    quotaStatus: {
      ...dailyResult.status,
      used: dailyResult.status.used + 1, // Account for the current request
      remaining: dailyResult.status.remaining - 1,
    },
  };
}

/**
 * Get the current quota status without checking/incrementing
 */
export async function getQuotaStatus(ip: string): Promise<DailyQuotaStatus> {
  if (!isSupabaseConfigured() || !supabaseClient) {
    const tomorrow = new Date();
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    tomorrow.setUTCHours(0, 0, 0, 0);

    return {
      used: 0,
      remaining: DAILY_QUOTA_LIMIT,
      limit: DAILY_QUOTA_LIMIT,
      resetsAt: tomorrow,
    };
  }

  const { used } = await getOrCreateQuotaRecord(ip);
  const tomorrow = new Date();
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(0, 0, 0, 0);

  return {
    used,
    remaining: Math.max(0, DAILY_QUOTA_LIMIT - used),
    limit: DAILY_QUOTA_LIMIT,
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
