# Drizzle migration baseline

`0000_baseline.sql` describes the current Deploybase schema for new databases.
It replaces the previous contradictory migration chain.

## Existing production database

Do not apply `0000_baseline.sql` to the existing production database. Production
already has the application tables but currently has an empty Drizzle migration
log. Applying the baseline there would try to create tables that already exist.

`pnpm db:migrate` is guarded and makes these decisions:

- A fresh database with no Deploybase tables and no migration history may run.
- A database with recognized migration history may run normally.
- A database with Deploybase tables but no migration history is refused.
- An inconsistent or unknown migration history is refused.

The normal command has no bypass.

## Future production adoption

Baseline adoption is a separate operational event, not part of deployment:

1. Back up production and verify the backup can be restored.
2. Verify the live schema is structurally equivalent to the generated baseline.
3. Review the baseline hash and confirm no pending schema change is mixed into it.
4. Set `DEPLOYBASE_BASELINE_ADOPTION=I_HAVE_VERIFIED_SCHEMA_PARITY_AND_BACKED_UP_THE_DATABASE`.
5. Run `pnpm db:migrate:adopt-baseline` once. This registers the baseline without executing its SQL.
6. Run `pnpm db:migrate` normally for later generated migrations.

Never run the adoption command as routine deployment automation.
