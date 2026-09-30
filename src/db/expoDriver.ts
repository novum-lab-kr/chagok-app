import * as SQLite from 'expo-sqlite';
import type { DbDriver, SqlValue } from './driver';

/** 쿼리 부분은 본 연결과 트랜잭션 연결이 같다. */
function statements(db: SQLite.SQLiteDatabase): Omit<DbDriver, 'transaction'> {
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

export async function createExpoDriver(name = 'chagok.db'): Promise<DbDriver> {
  const db = await SQLite.openDatabaseAsync(name);
  return {
    ...statements(db),
    /**
     * `withTransactionAsync`는 같은 연결의 다른 쿼리가 트랜잭션 안으로 섞일 수 있다.
     * exclusive는 별도 연결(txn)을 쓰므로 fn은 txn으로만 쿼리한다.
     * https://docs.expo.dev/versions/v57.0.0/sdk/sqlite/
     */
    async transaction<T>(fn: (tx: DbDriver) => Promise<T>): Promise<T> {
      let result: T | undefined;
      await db.withExclusiveTransactionAsync(async (txn) => {
        const tx: DbDriver = { ...statements(txn), transaction: (inner) => inner(tx) };
        result = await fn(tx);
      });
      return result as T;
    },
  };
}
