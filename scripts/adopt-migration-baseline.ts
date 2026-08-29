import "dotenv/config";
import postgres from "postgres";
import {
  getLocalMigrations,
  getMigrationDatabaseUrl,
  inspectMigrationState,
} from "./migration-database.ts";
import { APPLICATION_TABLES } from "./migration-guard.ts";

const CONFIRMATION = "I_HAVE_VERIFIED_SCHEMA_PARITY_AND_BACKED_UP_THE_DATABASE";

if (process.env.DEPLOYBASE_BASELINE_ADOPTION !== CONFIRMATION) {
  throw new Error(
    "Baseline adoption refused. Read drizzle/README.md and set DEPLOYBASE_BASELINE_ADOPTION to the documented confirmation only after backup and schema-parity verification.",
  );
}

const client = postgres(getMigrationDatabaseUrl(), { max: 1, prepare: false });

try {
  const state = await inspectMigrationState(client);
  const localMigrations = getLocalMigrations();
  if (localMigrations.length !== 1) {
    throw new Error(
      "Baseline adoption requires exactly one local baseline migration.",
    );
  }
  if (state.databaseMigrations.length) {
    throw new Error(
      "Migration history is already initialized; adoption is not applicable.",
    );
  }
  const missingTables = APPLICATION_TABLES.filter(
    (table) => !state.applicationTables.includes(table),
  );
  if (missingTables.length) {
    throw new Error(
      `Schema parity failed; missing tables: ${missingTables.join(", ")}.`,
    );
  }

  const baseline = localMigrations[0];
  await client.begin(async (transaction) => {
    await transaction`create schema if not exists drizzle`;
    await transaction`
      create table if not exists drizzle.__drizzle_migrations (
        id serial primary key,
        hash text not null,
        created_at bigint
      )
    `;
    await transaction`
      insert into drizzle.__drizzle_migrations (hash, created_at)
      values (${baseline.hash}, ${baseline.createdAt})
    `;
  });
  process.stdout.write("Baseline registered without executing baseline SQL.\n");
} finally {
  await client.end();
}
