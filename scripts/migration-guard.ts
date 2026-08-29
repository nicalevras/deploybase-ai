export const APPLICATION_TABLES = [
  "account",
  "ai_models",
  "gpu_price_samples",
  "gpu_pricing",
  "model_latency_samples",
  "model_throughput_samples",
  "session",
  "tools",
  "user",
  "user_favorites",
  "user_model_favorites",
  "user_tool_favorites",
  "verification",
] as const;

export interface MigrationRecord {
  hash: string;
  createdAt: number;
}

export interface MigrationGuardInput {
  applicationTables: string[];
  databaseMigrations: MigrationRecord[];
  localMigrations: MigrationRecord[];
}

export interface MigrationGuardDecision {
  allowed: boolean;
  state: "fresh" | "baselined" | "dangerous" | "invalid";
  reason: string;
}

export function evaluateMigrationGuard({
  applicationTables,
  databaseMigrations,
  localMigrations,
}: MigrationGuardInput): MigrationGuardDecision {
  if (!localMigrations.length) {
    return {
      allowed: false,
      state: "invalid",
      reason: "No local Drizzle migrations were found.",
    };
  }

  if (!applicationTables.length && !databaseMigrations.length) {
    return {
      allowed: true,
      state: "fresh",
      reason:
        "Fresh database: no Deploybase tables or migration records exist.",
    };
  }

  if (applicationTables.length && !databaseMigrations.length) {
    return {
      allowed: false,
      state: "dangerous",
      reason:
        "Deploybase tables exist but drizzle.__drizzle_migrations is empty. Refusing to apply the baseline over an existing schema. Complete the authorized baseline-adoption procedure first.",
    };
  }

  if (!applicationTables.length && databaseMigrations.length) {
    return {
      allowed: false,
      state: "invalid",
      reason:
        "Migration records exist but no Deploybase application tables were found.",
    };
  }

  const hasValidHistoryPrefix = databaseMigrations.every(
    (migration, index) =>
      localMigrations[index]?.hash === migration.hash &&
      localMigrations[index]?.createdAt === migration.createdAt,
  );
  if (
    databaseMigrations.length > localMigrations.length ||
    !hasValidHistoryPrefix
  ) {
    return {
      allowed: false,
      state: "invalid",
      reason:
        "Database migration history is not an ordered prefix of the local Drizzle history.",
    };
  }

  const missingTables = APPLICATION_TABLES.filter(
    (table) => !applicationTables.includes(table),
  );
  if (missingTables.length) {
    return {
      allowed: false,
      state: "invalid",
      reason: `The baselined database is missing expected tables: ${missingTables.join(", ")}.`,
    };
  }

  return {
    allowed: true,
    state: "baselined",
    reason: "Database has a recognized nonempty migration history.",
  };
}
