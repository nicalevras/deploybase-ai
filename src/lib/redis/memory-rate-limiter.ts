export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

interface MemoryEntry {
  count: number;
  reset: number;
}

export class BoundedMemoryRateLimiter {
  private readonly entries = new Map<string, MemoryEntry>();
  private readonly requests: number;
  private readonly windowMs: number;
  private readonly maxEntries: number;
  private readonly now: () => number;

  constructor(
    requests: number,
    windowMs: number,
    maxEntries = 10_000,
    now: () => number = Date.now,
  ) {
    this.requests = requests;
    this.windowMs = windowMs;
    this.maxEntries = maxEntries;
    this.now = now;
  }

  async limit(key: string): Promise<RateLimitResult> {
    const now = this.now();
    const current = this.entries.get(key);
    const entry =
      !current || current.reset <= now
        ? { count: 0, reset: now + this.windowMs }
        : current;

    entry.count += 1;
    this.entries.delete(key);
    this.entries.set(key, entry);
    this.prune(now);

    return {
      success: entry.count <= this.requests,
      limit: this.requests,
      remaining: Math.max(0, this.requests - entry.count),
      reset: entry.reset,
    };
  }

  private prune(now: number) {
    for (const [key, entry] of this.entries) {
      if (entry.reset <= now) this.entries.delete(key);
    }
    while (this.entries.size > this.maxEntries) {
      const oldestKey = this.entries.keys().next().value as string | undefined;
      if (!oldestKey) break;
      this.entries.delete(oldestKey);
    }
  }
}
