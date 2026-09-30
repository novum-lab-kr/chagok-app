import { DatabaseSync } from 'node:sqlite';
import type { DbDriver, SqlValue } from '../../src/db/driver';

/** 테스트용 인메모리 드라이버 — 실제 SQL을 실행한다. */
export function createNodeDriver(): DbDriver {
  const db = new DatabaseSync(':memory:');
  const driver: DbDriver = {
    async exec(sql) { db.exec(sql); },
    async run(sql, ...params: SqlValue[]) {
      db.prepare(sql).run(...(params as never[]));
    },
    async all<T>(sql: string, ...params: SqlValue[]) {
      return db.prepare(sql).all(...(params as never[])) as T[];
    },
    async first<T>(sql: string, ...params: SqlValue[]) {
      return (db.prepare(sql).get(...(params as never[])) as T) ?? null;
    },
    async transaction<T>(fn: (tx: DbDriver) => Promise<T>): Promise<T> {
      db.exec('BEGIN');
      try {
        const result = await fn(driver);
        db.exec('COMMIT');
        return result;
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    },
  };
  return driver;
}
