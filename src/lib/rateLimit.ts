/**
 * Rate Limiting Utility
 * AI Math Tutor v2
 *
 * Simple in-memory rate limiting for API routes.
 * Limits requests per IP address within a time window.
 */

// Store request timestamps by IP
const requestLog = new Map<string, number[]>();

// Configuration
const WINDOW_MS = 60 * 1000; // 1 minute window
const MAX_REQUESTS = 20; // Max requests per window

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
 * Check if a request should be rate limited
 *
 * @param ip - The client IP address
 * @returns Object with success status and optional retry-after seconds
 */
export function checkRateLimit(ip: string): {
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

  // Filter to only timestamps within the window
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

/**
 * Get the client IP from request headers
 * Handles various proxy configurations
 *
 * @param request - The incoming request
 * @returns Client IP address
 */
export function getClientIp(request: Request): string {
  // Check common headers for proxied requests
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // Take the first IP in the list
    return forwardedFor.split(',')[0].trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  // Fallback for direct connections (development)
  return '127.0.0.1';
}

/**
 * Reset rate limit for an IP (for testing)
 *
 * @param ip - The IP to reset
 */
export function resetRateLimit(ip: string): void {
  requestLog.delete(ip);
}

/**
 * Get current rate limit status for an IP
 *
 * @param ip - The IP to check
 * @returns Current request count and remaining quota
 */
export function getRateLimitStatus(ip: string): {
  used: number;
  remaining: number;
  limit: number;
} {
  const now = Date.now();
  const cutoff = now - WINDOW_MS;
  const timestamps = requestLog.get(ip) || [];
  const recentCount = timestamps.filter(t => t > cutoff).length;

  return {
    used: recentCount,
    remaining: Math.max(0, MAX_REQUESTS - recentCount),
    limit: MAX_REQUESTS,
  };
}
