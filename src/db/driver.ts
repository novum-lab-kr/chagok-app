export type SqlValue = string | number | null;

/**
 * 리포지토리가 의존하는 최소 SQL 인터페이스.
 * 프로덕션은 expo-sqlite, 테스트는 Node 내장 node:sqlite가 이 자리를 채운다.
 * Plan B(클라우드 동기화)에서도 이 경계가 교체 지점이 된다.
 */
export interface DbDriver {
  exec(sql: string): Promise<void>;
  run(sql: string, ...params: SqlValue[]): Promise<void>;
  all<T>(sql: string, ...params: SqlValue[]): Promise<T[]>;
  first<T>(sql: string, ...params: SqlValue[]): Promise<T | null>;
  /**
   * fn 안의 쓰기를 한 덩어리로 처리한다. fn이 던지면 모두 되돌리고 그 오류를 다시 던진다.
   * fn 안에서는 받은 tx로만 쿼리한다. 바깥 드라이버로 쿼리하면 트랜잭션 밖에서 실행된다.
   */
  transaction<T>(fn: (tx: DbDriver) => Promise<T>): Promise<T>;
}
