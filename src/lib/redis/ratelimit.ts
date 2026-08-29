import { getRedisClient } from "@/lib/redis/client";
import {
  BoundedMemoryRateLimiter,
  type RateLimitResult,
} from "@/lib/redis/memory-rate-limiter";
import { Ratelimit } from "@upstash/ratelimit";

function createLazyRateLimiter({
  requests,
  duration,
  windowMs,
  prefix,
}: {
  requests: number;
  duration: Parameters<typeof Ratelimit.fixedWindow>[1];
  windowMs: number;
  prefix: string;
}) {
  const memory = new BoundedMemoryRateLimiter(requests, windowMs);
  let upstash: Ratelimit | null = null;

  return {
    async limit(key: string): Promise<RateLimitResult> {
      const redis = getRedisClient();
      if (!redis) return memory.limit(key);
      upstash ??= new Ratelimit({
        redis,
        limiter: Ratelimit.fixedWindow(requests, duration),
        prefix,
      });
      return upstash.limit(key);
    },
  };
}

export const writeLimiter = createLazyRateLimiter({
  requests: 100,
  duration: "24 h",
  windowMs: 24 * 60 * 60 * 1000,
  prefix: "ratelimit:write",
});

export const readLimiter = createLazyRateLimiter({
  requests: 200,
  duration: "1 m",
  windowMs: 60 * 1000,
  prefix: "ratelimit:read",
});

export const newsletterLimiter = createLazyRateLimiter({
  requests: 5,
  duration: "1 h",
  windowMs: 60 * 60 * 1000,
  prefix: "ratelimit:newsletter",
});

/** Rate limit key for public read endpoints (IP-based) */
export function getReadRateLimitKey(ip: string): string {
  return `read:${ip}`;
}

/** Rate limit key for newsletter subscribe (IP-based) */
export function getNewsletterRateLimitKey(ip: string): string {
  return `newsletter:${ip}`;
}
