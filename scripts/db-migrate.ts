import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import {
  getMigrationDatabaseUrl,
  inspectMigrationState,
} from "./migration-database.ts";
import { evaluateMigrationGuard } from "./migration-guard.ts";

const client = postgres(getMigrationDatabaseUrl(), { max: 1, prepare: false });

try {
  const state = await inspectMigrationState(client);
  const decision = evaluateMigrationGuard(state);
  if (!decision.allowed) {
    throw new Error(`[db:migrate] ${decision.reason}`);
  }

  process.stdout.write(`[db:migrate] ${decision.reason}\n`);
  await migrate(drizzle(client), { migrationsFolder: "drizzle" });
  process.stdout.write("[db:migrate] Migration completed.\n");
} finally {
  await client.end();
}
