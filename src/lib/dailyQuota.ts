/**
 * Daily Chat Quota Management
 * AI Math Tutor v2
 *
 * Browser-based daily request quota to protect API usage.
 * Tracks requests per user in localStorage with 24-hour reset.
 */

const DAILY_QUOTA_STORAGE_KEY = 'math-tutor-daily-quota';
const DEFAULT_DAILY_LIMIT = 50;

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
 * Check and consume a quota slot
 *
 * @returns Object indicating if request is allowed and quota status
 */
export function checkDailyQuota(): {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetAt?: string; // ISO timestamp when quota will reset
  exceeded: boolean;
} {
  const quota = getDailyQuota();

  // Check if we need to reset (24 hours after limit was hit)
  if (shouldResetQuota(quota)) {
    const resetQuotaData = resetQuota();
    saveDailyQuota(resetQuotaData);
    return {
      allowed: true,
      remaining: resetQuotaData.dailyLimit - 1,
      limit: resetQuotaData.dailyLimit,
      exceeded: false,
    };
  }

  // Check if already at limit
  if (quota.requestsToday >= quota.dailyLimit) {
    // Set limit reached timestamp if not set
    if (!quota.limitReachedAt) {
      quota.limitReachedAt = new Date().toISOString();
      saveDailyQuota(quota);
    }

    const resetAt = new Date(quota.limitReachedAt);
    resetAt.setHours(resetAt.getHours() + 24);

    return {
      allowed: false,
      remaining: 0,
      limit: quota.dailyLimit,
      resetAt: resetAt.toISOString(),
      exceeded: true,
    };
  }

  // Increment request count
  quota.requestsToday += 1;
  saveDailyQuota(quota);

  return {
    allowed: true,
    remaining: quota.dailyLimit - quota.requestsToday,
    limit: quota.dailyLimit,
    exceeded: false,
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

/**
 * Reset daily quota (for testing purposes)
 */
export function resetDailyQuota(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(DAILY_QUOTA_STORAGE_KEY);
}

/**
 * Set custom daily limit (for admin/config purposes)
 */
export function setDailyLimit(limit: number): void {
  const quota = getDailyQuota();
  quota.dailyLimit = Math.max(1, limit);
  saveDailyQuota(quota);
}
