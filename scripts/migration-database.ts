import { readMigrationFiles } from "drizzle-orm/migrator";
import postgres from "postgres";
import { APPLICATION_TABLES, type MigrationRecord } from "./migration-guard.ts";

export function getMigrationDatabaseUrl() {
  const url = process.env.DATABASE_DIRECT_URL ?? process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL or DATABASE_DIRECT_URL is required.");
  }
  return url;
}

export function getLocalMigrations(): MigrationRecord[] {
  return readMigrationFiles({ migrationsFolder: "drizzle" }).map(
    (migration) => ({
      hash: migration.hash,
      createdAt: migration.folderMillis,
    }),
  );
}

export async function inspectMigrationState(sql: postgres.Sql) {
  const publicTables = await sql<{ table_name: string }[]>`
    select table_name
    from information_schema.tables
    where table_schema = 'public' and table_type = 'BASE TABLE'
  `;
  const applicationTables = publicTables
    .map((row) => row.table_name)
    .filter((table) => APPLICATION_TABLES.includes(table as never));

  const [migrationTable] = await sql<{ exists: string | null }[]>`
    select to_regclass('drizzle.__drizzle_migrations')::text as exists
  `;
  const databaseMigrations = migrationTable?.exists
    ? await sql<{ hash: string; created_at: string | number }[]>`
        select hash, created_at
        from drizzle.__drizzle_migrations
        order by created_at asc
      `
    : [];

  return {
    applicationTables,
    databaseMigrations: databaseMigrations.map((migration) => ({
      hash: migration.hash,
      createdAt: Number(migration.created_at),
    })),
    localMigrations: getLocalMigrations(),
  };
}
