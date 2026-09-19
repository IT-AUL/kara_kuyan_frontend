import { eq } from 'drizzle-orm';

import type { KeyValueStore } from '@/ports/key-value';

import type { Db } from './db';
import { kv } from './schema';

/**
 * Best-effort cache: a failing read or write (e.g. a database handle invalidated by a JS reload in development)
 * must never break a screen, so errors are swallowed and reads fall back to "not cached".
 */
export class SqliteKeyValueStore implements KeyValueStore {
  constructor(private readonly db: Db) {}

  get(key: string): string | null {
    try {
      return this.db.select().from(kv).where(eq(kv.key, key)).get()?.value ?? null;
    } catch {
      return null;
    }
  }

  set(key: string, value: string): void {
    try {
      this.db
        .insert(kv)
        .values({ key, value, updatedAt: Date.now() })
        .onConflictDoUpdate({ target: kv.key, set: { value, updatedAt: Date.now() } })
        .run();
    } catch {
      // cache only
    }
  }

  remove(key: string): void {
    try {
      this.db.delete(kv).where(eq(kv.key, key)).run();
    } catch {
      // cache only
    }
  }
}
