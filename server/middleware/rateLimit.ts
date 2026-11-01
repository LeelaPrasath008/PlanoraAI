import { Request, Response, NextFunction, RequestHandler } from 'express';
import { SERVER_CONFIG } from '../config';

interface RateBucket {
  count: number;
  resetAt: number;
}

export interface RateLimiterOptions {
  windowMs?: number;
  maxGeneral?: number;
  maxStrict?: number;
  maxBuckets?: number;
}

/**
 * Creates a sliding-window IP rate limiter with periodic `.unref()` bucket purging,
 * bounded map capacity, and stricter limits (20/min) for heavy AI generation endpoints
 * (`/generate-plan` and `/copilot`).
 */
export function createRateLimiter(
  options: RateLimiterOptions = {}
): RequestHandler {
  const windowMs = options.windowMs ?? SERVER_CONFIG.RATE_WINDOW_MS;
  const maxGeneral = options.maxGeneral ?? SERVER_CONFIG.RATE_MAX_GENERAL;
  const maxStrict = options.maxStrict ?? SERVER_CONFIG.RATE_MAX_STRICT;
  const maxBuckets = options.maxBuckets ?? SERVER_CONFIG.RATE_MAX_BUCKETS;

  const buckets = new Map<string, RateBucket>();

  const purgeTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets.entries()) {
      if (now > bucket.resetAt) {
        buckets.delete(key);
      }
    }
  }, Math.max(5000, Math.floor(windowMs / 2)));

  if (typeof purgeTimer.unref === 'function') {
    purgeTimer.unref();
  }

  return function rateLimitMiddleware(
    req: Request,
    res: Response,
    next: NextFunction
  ): void {
    const ip = req.ip || req.socket?.remoteAddress || 'local';
    const isStrictRoute =
      req.path.endsWith('/generate-plan') || req.path.endsWith('/copilot');
    const bucketKey = `${ip}:${isStrictRoute ? 'strict' : 'general'}`;
    const limit = isStrictRoute ? maxStrict : maxGeneral;
    const now = Date.now();

    const existing = buckets.get(bucketKey);
    if (!existing || now > existing.resetAt) {
      if (buckets.size >= maxBuckets && !buckets.has(bucketKey)) {
        const oldestKey = buckets.keys().next().value;
        if (oldestKey) buckets.delete(oldestKey);
      }
      buckets.set(bucketKey, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    if (existing.count >= limit) {
      res.status(429).json({
        error: 'Too many requests. Please wait a moment before retrying.',
        code: 'rate_limit_exceeded',
      });
      return;
    }

    existing.count += 1;
    next();
  };
}
