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

/**
 * 배타 트랜잭션은 새 연결을 연다. 저널이 delete이고 busy_timeout이 0이면 그동안 다른 연결의 읽기가
 * 기다리지 않고 "database is locked"로 실패한다(2026-10-09 iPhone 16 Pro: 위젯 동기화 읽기 + 판 저장).
 * WAL이면 쓰는 동안에도 읽을 수 있고, busy_timeout이면 쓰기끼리 겹쳐도 잠시 기다린다. WAL은 DB 파일에 남는다.
 */
const BUSY_TIMEOUT = 'PRAGMA busy_timeout = 5000';

export async function createExpoDriver(name = 'chagok.db'): Promise<DbDriver> {
  const db = await SQLite.openDatabaseAsync(name);
  await db.execAsync(`PRAGMA journal_mode = WAL; ${BUSY_TIMEOUT};`);
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
        // 새 연결이라 본 연결의 설정을 물려받지 않는다. BEGIN은 아직 잠그지 않았으니 첫 쿼리 전에 건다.
        await txn.execAsync(BUSY_TIMEOUT);
        const tx: DbDriver = { ...statements(txn), transaction: (inner) => inner(tx) };
        result = await fn(tx);
      });
      return result as T;
    },
  };
}
