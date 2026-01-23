/**
 * useDailyQuota Hook
 * AI Math Tutor v2
 *
 * Client-side hook for displaying daily chat quota.
 * Quota is tracked server-side in Supabase; this hook displays the status.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { getTimeUntilReset } from '@/lib/dailyQuota';

export interface QuotaStatus {
  used: number;
  remaining: number;
  limit: number;
  resetAt?: string;
  exceeded: boolean;
}

export interface QuotaCountdown {
  hours: number;
  minutes: number;
  seconds: number;
  formatted: string;
}

/**
 * Parse quota status from API response headers
 */
function parseQuotaFromHeaders(headers: Headers): QuotaStatus | null {
  const remaining = headers.get('X-Daily-Quota-Remaining');
  const limit = headers.get('X-Daily-Quota-Limit');
  const resetsAt = headers.get('X-Daily-Quota-Resets-At');

  if (remaining !== null && limit !== null) {
    const remainingNum = parseInt(remaining, 10);
    const limitNum = parseInt(limit, 10);
    const used = limitNum - remainingNum;

    return {
      used,
      remaining: remainingNum,
      limit: limitNum,
      resetAt: resetsAt || undefined,
      exceeded: remainingNum <= 0,
    };
  }

  return null;
}

/**
 * Hook for managing daily chat quota display
 *
 * @returns Object with quota status, countdown, and control functions
 */
export function useDailyQuota() {
  const [quotaStatus, setQuotaStatus] = useState<QuotaStatus>({
    used: 0,
    remaining: 50,
    limit: 50,
    exceeded: false,
  });
  const [countdown, setCountdown] = useState<QuotaCountdown | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Update quota status from API response
  const updateQuotaFromResponse = useCallback((response: Response) => {
    const status = parseQuotaFromHeaders(response.headers);
    if (status) {
      setQuotaStatus(status);

      // Update countdown if quota is exceeded
      if (status.exceeded && status.resetAt) {
        setCountdown(getTimeUntilReset(status.resetAt));
      } else {
        setCountdown(null);
      }
    }
  }, []);

  // Refresh quota status by making a lightweight API call
  const refreshQuotaStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/chat', {
        method: 'OPTIONS',
      });

      if (response.ok) {
        const status = parseQuotaFromHeaders(response.headers);
        if (status) {
          setQuotaStatus(status);

          if (status.exceeded && status.resetAt) {
            setCountdown(getTimeUntilReset(status.resetAt));
          } else {
            setCountdown(null);
          }
        }
      }
    } catch (error) {
      console.error('Failed to refresh quota status:', error);
    }
  }, []);

  // Check if quota allows a request (client-side estimate)
  // Actual enforcement happens server-side
  const consumeQuota = useCallback((): { allowed: boolean } => {
    // Client-side prediction - actual check happens server-side
    const allowed = quotaStatus.remaining > 0;

    if (allowed) {
      // Optimistically update
      setQuotaStatus(prev => ({
        ...prev,
        used: prev.used + 1,
        remaining: Math.max(0, prev.remaining - 1),
      }));
    }

    return { allowed };
  }, [quotaStatus.remaining]);

  // Reset quota (for testing - doesn't affect server)
  const resetQuota = useCallback(() => {
    setQuotaStatus({
      used: 0,
      remaining: 50,
      limit: 50,
      exceeded: false,
    });
    setCountdown(null);
  }, []);

  // Set up countdown timer when quota is exceeded
  useEffect(() => {
    if (quotaStatus.exceeded && quotaStatus.resetAt) {
      // Update countdown every second
      intervalRef.current = setInterval(() => {
        const timeLeft = getTimeUntilReset(quotaStatus.resetAt!);

        // Check if we've reached reset time
        if (timeLeft.hours === 0 && timeLeft.minutes === 0 && timeLeft.seconds === 0) {
          refreshQuotaStatus();
        } else {
          setCountdown(timeLeft);
        }
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setCountdown(null);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [quotaStatus.exceeded, quotaStatus.resetAt, refreshQuotaStatus]);

  // Initial quota fetch on mount
  useEffect(() => {
    refreshQuotaStatus();
  }, [refreshQuotaStatus]);

  return {
    quotaStatus,
    countdown,
    consumeQuota,
    refreshQuotaStatus,
    resetQuota,
    updateQuotaFromResponse,
  };
}
