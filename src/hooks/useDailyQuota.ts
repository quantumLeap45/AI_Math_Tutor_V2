/**
 * useDailyQuota Hook
 * AI Math Tutor v2
 *
 * Client-side hook for managing daily chat quota.
 * Provides quota status and countdown timer functionality.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  checkDailyQuota,
  getQuotaStatus,
  getTimeUntilReset,
  resetDailyQuota,
} from '@/lib/dailyQuota';

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
 * Hook for managing daily chat quota
 *
 * @returns Object with quota status, countdown, and control functions
 */
export function useDailyQuota() {
  const [quotaStatus, setQuotaStatus] = useState<QuotaStatus>(() => getQuotaStatus());
  const [countdown, setCountdown] = useState<QuotaCountdown | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Update quota status from localStorage
  const refreshQuotaStatus = useCallback(() => {
    const status = getQuotaStatus();
    setQuotaStatus(status);

    // Update countdown if quota is exceeded
    if (status.exceeded && status.resetAt) {
      setCountdown(getTimeUntilReset(status.resetAt));
    } else {
      setCountdown(null);
    }
  }, []);

  // Try to consume a quota slot
  const consumeQuota = useCallback((): { allowed: boolean; resetAt?: string } => {
    const result = checkDailyQuota();
    refreshQuotaStatus();
    return {
      allowed: result.allowed,
      resetAt: result.resetAt,
    };
  }, [refreshQuotaStatus]);

  // Reset quota (for testing)
  const resetQuota = useCallback(() => {
    resetDailyQuota();
    refreshQuotaStatus();
  }, [refreshQuotaStatus]);

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

  // Listen for storage changes from other tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'math-tutor-daily-quota') {
        refreshQuotaStatus();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [refreshQuotaStatus]);

  return {
    quotaStatus,
    countdown,
    consumeQuota,
    refreshQuotaStatus,
    resetQuota,
  };
}
