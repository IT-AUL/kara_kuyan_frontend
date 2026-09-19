import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync, type SQLiteDatabase } from 'expo-sqlite';

import { migrations } from './migrations';

export type Db = ReturnType<typeof openDb>['db'];

function migrate(expo: SQLiteDatabase): void {
  const current = expo.getFirstSync<{ user_version: number }>('PRAGMA user_version')?.user_version ?? 0;
  for (const m of migrations.filter((x) => x.version > current)) {
    expo.withTransactionSync(() => {
      expo.execSync(m.sql);
      expo.execSync(`PRAGMA user_version = ${m.version}`);
    });
  }
}

type Opened = { db: ReturnType<typeof drizzle>; expo: SQLiteDatabase };

/**
 * Opens (and migrates) the app database once per JS runtime. Statements run synchronously, so a Drizzle
 * transaction is atomic. The handle is kept on `globalThis`: a development Fast Refresh re-evaluates modules,
 * and opening the same file a second time lets the first native handle be finalised under the new one, which
 * surfaces as `NativeDatabase.prepareSync ... NullPointerException`.
 */
export function openDb(name = 'kara-kuyan.db'): Opened {
  const registry = globalThis as { __kkDbs?: Record<string, Opened> };
  registry.__kkDbs ??= {};
  const existing = registry.__kkDbs[name];
  if (existing) return existing;
  const expo = openDatabaseSync(name);
  expo.execSync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  migrate(expo);
  const opened = { db: drizzle(expo), expo };
  registry.__kkDbs[name] = opened;
  return opened;
}
