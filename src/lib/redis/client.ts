import { logger } from "@/lib/logger";
import { resolveRedisConfiguration } from "@/lib/redis/configuration";
import { Redis } from "@upstash/redis";

type Environment = Record<string, string | undefined>;

let redisClient: Redis | null | undefined;
let warnedAboutMissingRedis = false;

export function getRedisClient(
  environment: Environment = process.env,
): Redis | null {
  if (redisClient !== undefined) return redisClient;

  const configuration = resolveRedisConfiguration(environment);
  if (!configuration) {
    redisClient = null;
    if (environment.NODE_ENV === "production" && !warnedAboutMissingRedis) {
      warnedAboutMissingRedis = true;
      logger.warn(
        "[rate-limit] Upstash is not configured; using bounded per-instance memory limits.",
      );
    }
    return null;
  }

  redisClient = new Redis(configuration);
  return redisClient;
}

export function resetRedisClientForTests() {
  redisClient = undefined;
  warnedAboutMissingRedis = false;
}
