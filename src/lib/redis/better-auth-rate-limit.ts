import { getRedisClient } from "@/lib/redis/client";

export interface BetterAuthRateLimitValue {
  key: string;
  count: number;
  lastRequest: number;
}

class BoundedRateLimitStorage {
  private readonly values = new Map<
    string,
    { value: BetterAuthRateLimitValue; expiresAt: number }
  >();

  constructor(private readonly maxEntries = 10_000) {}

  get(key: string) {
    const entry = this.values.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= Date.now()) {
      this.values.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: BetterAuthRateLimitValue) {
    this.values.delete(key);
    this.values.set(key, {
      value,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    });
    while (this.values.size > this.maxEntries) {
      const oldestKey = this.values.keys().next().value as string | undefined;
      if (!oldestKey) break;
      this.values.delete(oldestKey);
    }
  }
}

const memoryStorage = new BoundedRateLimitStorage();
const PREFIX = "better-auth:rate-limit:";

export function createBetterAuthRateLimitStorage() {
  return {
    async get(
      key: string,
    ): Promise<BetterAuthRateLimitValue | null | undefined> {
      const redis = getRedisClient();
      if (!redis) return memoryStorage.get(key);
      return redis.get<BetterAuthRateLimitValue>(`${PREFIX}${key}`);
    },
    async set(
      key: string,
      value: BetterAuthRateLimitValue,
      _update?: boolean,
    ): Promise<void> {
      const redis = getRedisClient();
      if (!redis) {
        memoryStorage.set(key, value);
        return;
      }
      await redis.set(`${PREFIX}${key}`, value, { ex: 24 * 60 * 60 });
    },
  };
}
