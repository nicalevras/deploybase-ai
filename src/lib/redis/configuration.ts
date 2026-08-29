export interface RedisConfiguration {
  url: string;
  token: string;
}

type Environment = Record<string, string | undefined>;

export function resolveRedisConfiguration(
  environment: Environment = process.env,
): RedisConfiguration | null {
  const url = environment.UPSTASH_REDIS_REST_URL;
  const token = environment.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url, token } : null;
}
