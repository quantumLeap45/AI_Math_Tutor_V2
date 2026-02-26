/**
 * Daily Chat Quota Management
 * AI Math Tutor v2
 *
 * Browser-based daily request quota to protect API usage.
 * Tracks requests per user in localStorage with 24-hour reset.
 */

const DAILY_QUOTA_STORAGE_KEY = 'math-tutor-daily-quota';
const DEFAULT_DAILY_LIMIT = 30;

/**
 * Daily quota data structure
 */
export interface DailyQuotaData {
  /** Number of requests made today */
  requestsToday: number;
  /** ISO timestamp of last reset */
  lastReset: string;
  /** ISO timestamp when limit was first hit (null if not hit) */
  limitReachedAt: string | null;
  /** Configurable daily limit */
  dailyLimit: number;
}

/**
 * Get the daily quota data from localStorage
 * SSR-safe: returns default data if window is undefined
 */
export function getDailyQuota(): DailyQuotaData {
  if (typeof window === 'undefined') {
    return {
      requestsToday: 0,
      lastReset: new Date().toISOString(),
      limitReachedAt: null,
      dailyLimit: DEFAULT_DAILY_LIMIT,
    };
  }

  const raw = localStorage.getItem(DAILY_QUOTA_STORAGE_KEY);
  if (!raw) {
    return {
      requestsToday: 0,
      lastReset: new Date().toISOString(),
      limitReachedAt: null,
      dailyLimit: DEFAULT_DAILY_LIMIT,
    };
  }

  try {
    return JSON.parse(raw) as DailyQuotaData;
  } catch {
    return {
      requestsToday: 0,
      lastReset: new Date().toISOString(),
      limitReachedAt: null,
      dailyLimit: DEFAULT_DAILY_LIMIT,
    };
  }
}

/**
 * Save daily quota data to localStorage
 */
function saveDailyQuota(data: DailyQuotaData): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(DAILY_QUOTA_STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save daily quota:', error);
  }
}

/**
 * Check if quota should be reset based on 24-hour window
 * Reset happens 24 hours after the limit was first hit
 */
function shouldResetQuota(quota: DailyQuotaData): boolean {
  if (!quota.limitReachedAt) return false;

  const limitReachedTime = new Date(quota.limitReachedAt).getTime();
  const now = Date.now();
  const twentyFourHours = 24 * 60 * 60 * 1000;

  return now - limitReachedTime >= twentyFourHours;
}

/**
 * Reset quota to initial state
 */
function resetQuota(): DailyQuotaData {
  return {
    requestsToday: 0,
    lastReset: new Date().toISOString(),
    limitReachedAt: null,
    dailyLimit: DEFAULT_DAILY_LIMIT,
  };
}

/**
 * Get current quota status without consuming a slot
 */
export function getQuotaStatus(): {
  used: number;
  remaining: number;
  limit: number;
  resetAt?: string;
  exceeded: boolean;
} {
  const quota = getDailyQuota();

  if (quota.limitReachedAt && shouldResetQuota(quota)) {
    // Quota should reset but hasn't been consumed yet
    return {
      used: 0,
      remaining: quota.dailyLimit,
      limit: quota.dailyLimit,
      exceeded: false,
    };
  }

  const resetAt = quota.limitReachedAt
    ? new Date(new Date(quota.limitReachedAt).getTime() + 24 * 60 * 60 * 1000).toISOString()
    : undefined;

  return {
    used: quota.requestsToday,
    remaining: Math.max(0, quota.dailyLimit - quota.requestsToday),
    limit: quota.dailyLimit,
    resetAt,
    exceeded: quota.requestsToday >= quota.dailyLimit,
  };
}

/**
 * Calculate remaining time until quota resets
 */
export function getTimeUntilReset(resetAt: string): {
  hours: number;
  minutes: number;
  seconds: number;
  formatted: string;
} {
  const now = Date.now();
  const resetTime = new Date(resetAt).getTime();
  const diff = Math.max(0, resetTime - now);

  const hours = Math.floor(diff / (60 * 60 * 1000));
  const minutes = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
  const seconds = Math.floor((diff % (60 * 1000)) / 1000);

  const pad = (n: number) => n.toString().padStart(2, '0');

  return {
    hours,
    minutes,
    seconds,
    formatted: `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`,
  };
}

