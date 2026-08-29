/**
 * Environment variable validation.
 *
 * Import this module early (e.g. in root layout or instrumentation hook) to
 * surface missing configuration before the app starts serving requests.
 *
 * Required variables throw on import if absent.
 * Optional variables resolve to `undefined` when not set.
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optionalEnv(name: string): string | undefined {
  return process.env[name] ?? undefined;
}

// ---------------------------------------------------------------------------
// Validated environment
// ---------------------------------------------------------------------------

export const env = {
  // -- Server (always required) ---------------------------------------------
  /** Postgres connection string used by Drizzle / postgres.js */
  DATABASE_URL: requireEnv("DATABASE_URL"),
  /** Secret used by better-auth for signing tokens / cookies */
  BETTER_AUTH_SECRET: requireEnv("BETTER_AUTH_SECRET"),

  // -- Upstash Redis (optional; bounded per-instance fallback) ---------------
  UPSTASH_REDIS_REST_URL: optionalEnv("UPSTASH_REDIS_REST_URL"),
  UPSTASH_REDIS_REST_TOKEN: optionalEnv("UPSTASH_REDIS_REST_TOKEN"),

  // -- OAuth providers (optional; features degrade gracefully) --------------
  GOOGLE_CLIENT_ID: optionalEnv("GOOGLE_CLIENT_ID"),
  GOOGLE_CLIENT_SECRET: optionalEnv("GOOGLE_CLIENT_SECRET"),
  GITHUB_CLIENT_ID: optionalEnv("GITHUB_CLIENT_ID"),
  GITHUB_CLIENT_SECRET: optionalEnv("GITHUB_CLIENT_SECRET"),
  HUGGINGFACE_CLIENT_ID: optionalEnv("HUGGINGFACE_CLIENT_ID"),
  HUGGINGFACE_CLIENT_SECRET: optionalEnv("HUGGINGFACE_CLIENT_SECRET"),

  // -- Email (Resend) -------------------------------------------------------
  RESEND_API_KEY: optionalEnv("RESEND_API_KEY"),
  RESEND_FROM_EMAIL: optionalEnv("RESEND_FROM_EMAIL"),
  RESEND_NEWSLETTER_SEGMENT_ID: optionalEnv("RESEND_NEWSLETTER_SEGMENT_ID"),

  // -- Cron / QStash --------------------------------------------------------
  CRON_SECRET: optionalEnv("CRON_SECRET"),
  QSTASH_TOKEN: optionalEnv("QSTASH_TOKEN"),
  QSTASH_URL: optionalEnv("QSTASH_URL"),

  // -- Public / misc --------------------------------------------------------
  NEXT_PUBLIC_SITE_URL: optionalEnv("NEXT_PUBLIC_SITE_URL"),
  NEXT_PUBLIC_APP_URL: optionalEnv("NEXT_PUBLIC_APP_URL"),
} as const;
