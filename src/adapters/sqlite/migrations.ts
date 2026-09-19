/**
 * Versioned schema migrations, applied in order inside a transaction and tracked with `PRAGMA user_version`.
 * Hand-written on purpose: drizzle-kit's Expo flow needs Babel/Metro SQL inlining (see the change's plan,
 * Deviations). `schema.ts` stays the typed source for queries; keep both in step.
 */
export type Migration = { version: number; sql: string };

export const migrations: readonly Migration[] = [
  {
    version: 1,
    sql: `
      CREATE TABLE submissions (
        uuid TEXT PRIMARY KEY NOT NULL,
        assignment_id TEXT NOT NULL,
        class_id TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        saved_at INTEGER NOT NULL
      );
      CREATE TABLE outbox (
        submission_uuid TEXT PRIMARY KEY NOT NULL REFERENCES submissions(uuid),
        status TEXT NOT NULL CHECK (status IN ('pending','syncing','synced','failed')),
        attempts INTEGER NOT NULL,
        next_attempt_at INTEGER NOT NULL,
        last_error TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE INDEX outbox_due_idx ON outbox (status, next_attempt_at);
    `,
  },
];
