import * as SQLite from 'expo-sqlite';
import type { DbDriver, SqlValue } from './driver';

export async function createExpoDriver(name = 'chagok.db'): Promise<DbDriver> {
  const db = await SQLite.openDatabaseAsync(name);
  return {
    async exec(sql) { await db.execAsync(sql); },
    async run(sql, ...params: SqlValue[]) { await db.runAsync(sql, ...params); },
    async all<T>(sql: string, ...params: SqlValue[]) {
      return db.getAllAsync<T>(sql, ...params);
    },
    async first<T>(sql: string, ...params: SqlValue[]) {
      return (await db.getFirstAsync<T>(sql, ...params)) ?? null;
    },
  };
}
