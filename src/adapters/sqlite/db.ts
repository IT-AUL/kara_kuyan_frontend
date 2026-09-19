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

/** Opens (and migrates) the app database. Statements run synchronously, so a Drizzle transaction is atomic. */
export function openDb(name = 'kara-kuyan.db') {
  const expo = openDatabaseSync(name);
  expo.execSync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  migrate(expo);
  return { db: drizzle(expo), expo };
}
