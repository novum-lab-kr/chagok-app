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
}
