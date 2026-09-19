import { eq } from 'drizzle-orm';

import type { KeyValueStore } from '@/ports/key-value';

import type { Db } from './db';
import { kv } from './schema';

export class SqliteKeyValueStore implements KeyValueStore {
  constructor(private readonly db: Db) {}

  get(key: string): string | null {
    return this.db.select().from(kv).where(eq(kv.key, key)).get()?.value ?? null;
  }

  set(key: string, value: string): void {
    this.db
      .insert(kv)
      .values({ key, value, updatedAt: Date.now() })
      .onConflictDoUpdate({ target: kv.key, set: { value, updatedAt: Date.now() } })
      .run();
  }

  remove(key: string): void {
    this.db.delete(kv).where(eq(kv.key, key)).run();
  }
}
