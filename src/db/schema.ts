/**
 * 버전 단위 마이그레이션.
 * 배열 인덱스 i를 적용하면 스키마 버전이 i+1이 된다.
 *
 * 규칙:
 * - 이미 배포된 버전의 SQL은 절대 수정하지 않는다. 새 버전을 뒤에 붙인다.
 * - 각 버전 안의 문장은 순서대로 실행된다.
 *
 * Expo SDK 57의 expo-sqlite에는 마이그레이션 헬퍼가 없고 `PRAGMA user_version`으로
 * 직접 추적하는 것이 공식 권장 방식이다.
 * https://docs.expo.dev/versions/v57.0.0/sdk/sqlite/
 */
export const MIGRATIONS: readonly (readonly string[])[] = [
  // v1 — 최초 테이블
  [
    `CREATE TABLE IF NOT EXISTS goals (
       id TEXT PRIMARY KEY NOT NULL,
       name TEXT NOT NULL,
       board_type TEXT NOT NULL CHECK (board_type IN ('calendar','tally')),
       total_slots INTEGER,
       created_at INTEGER NOT NULL
     );`,
    `CREATE TABLE IF NOT EXISTS stickers (
       id TEXT PRIMARY KEY NOT NULL,
       goal_id TEXT NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
       placed_at INTEGER NOT NULL,
       slot_index INTEGER NOT NULL,
       sticker_type TEXT NOT NULL DEFAULT 'stamp'
     );`,
    `CREATE INDEX IF NOT EXISTS idx_stickers_goal ON stickers(goal_id);`,
    `CREATE TABLE IF NOT EXISTS records (
       id TEXT PRIMARY KEY NOT NULL,
       sticker_id TEXT NOT NULL UNIQUE REFERENCES stickers(id) ON DELETE CASCADE,
       photo_uri TEXT,
       memo TEXT,
       created_at INTEGER NOT NULL
     );`,
  ],

  // v2 — 목표별 기본 스티커 (PRD 4.4). 스티커 종류를 pocket 체계로 옮긴다.
  //
  // v1의 기본값 'stamp'는 폐기된 22종 카탈로그의 id다. 현재 라이브러리
  // (src/stickers/pocket)에는 그 id가 없어 그대로 두면 렌더할 수 없는 값이 쌓인다.
  // SQLite는 컬럼 기본값을 바꿀 수 없으므로 테이블을 다시 만든다.
  [
    `ALTER TABLE goals ADD COLUMN default_sticker_id TEXT NOT NULL DEFAULT 'sprout';`,

    `CREATE TABLE stickers_v2 (
       id TEXT PRIMARY KEY NOT NULL,
       goal_id TEXT NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
       placed_at INTEGER NOT NULL,
       slot_index INTEGER NOT NULL,
       sticker_type TEXT NOT NULL DEFAULT 'sprout'
     );`,
    // 폐기된 id는 기본 스티커로 바꿔 옮긴다. 렌더 불가한 값을 남기지 않는다.
    `INSERT INTO stickers_v2 (id, goal_id, placed_at, slot_index, sticker_type)
       SELECT id, goal_id, placed_at, slot_index,
              CASE WHEN sticker_type IN ('sprout','cat','star','flower','book','shoe')
                   THEN sticker_type ELSE 'sprout' END
       FROM stickers;`,
    `DROP TABLE stickers;`,
    `ALTER TABLE stickers_v2 RENAME TO stickers;`,
    `CREATE INDEX IF NOT EXISTS idx_stickers_goal ON stickers(goal_id);`,
  ],

  // v3 — 앱 설정 플래그. 튜토리얼 완료/건너뛰기 상태를 담는다 (PRD 4.6).
  //
  // 저장 위치는 PRD에서 미확정이었다. 새 의존성 없이 기존 DB에 두어
  // 사용자 범위로 잡았다. 동기화를 붙이면 함께 따라간다.
  // 기기 범위로 바꿔야 하면 이 테이블을 비우고 로컬 저장소로 옮기면 된다.
  [
    `CREATE TABLE IF NOT EXISTS app_settings (
       key TEXT PRIMARY KEY NOT NULL,
       value TEXT NOT NULL
     );`,
  ],

  // v4 — 목록·판 상세 구조 (PRD 4.1, 4.3, 4.7 · docs/DEV-DESIGN-home-structure.md 1절)
  //
  // end_date: 달력판 종료일. 'YYYY-MM-DD' 로컬 날짜라 시간대 변환 없이 localDateKey와 비교한다.
  // completed_at: 완성한 시각. NULL이면 진행 중이다.
  // completion_seen: 완성 뒤 닫기/계속하기를 골랐는가. 0인 완성한 판은 열 때 완성 흐름을 보여준다.
  // last_placed_at: 마지막으로 붙인 시각. 떼도 바꾸지 않으므로 stickers에서 계산할 수 없다.
  // initial_slots: 적립판을 만들 때의 칸 수. 칸 늘리기의 기본값이다.
  [
    `ALTER TABLE goals ADD COLUMN end_date TEXT;`,
    `ALTER TABLE goals ADD COLUMN completed_at INTEGER;`,
    `ALTER TABLE goals ADD COLUMN completion_seen INTEGER NOT NULL DEFAULT 0;`,
    `ALTER TABLE goals ADD COLUMN last_placed_at INTEGER;`,
    `ALTER TABLE goals ADD COLUMN initial_slots INTEGER;`,
    `UPDATE goals SET last_placed_at =
       (SELECT MAX(placed_at) FROM stickers WHERE stickers.goal_id = goals.id);`,
    `UPDATE goals SET initial_slots = total_slots WHERE board_type = 'tally';`,
    // 옛 규칙에는 완성이 없었다. 이미 다 찬 적립판은 완성으로 옮기고 완성 흐름을 한 번 보여준다.
    `UPDATE goals SET completed_at = last_placed_at, completion_seen = 0
      WHERE board_type = 'tally' AND total_slots IS NOT NULL
        AND (SELECT COUNT(*) FROM stickers WHERE stickers.goal_id = goals.id) >= total_slots;`,
  ],
  // v5 — 백업 (docs/superpowers/specs/2026-09-30-account-backup-design.md ②)
  //
  // updated_at: 행 단위 병합(패드 지원)의 기준. 기존 행은 만든/붙인 시각으로 채운다.
  // photo_remote_path: 서버 Storage 경로. 기기 경로(photo_uri)는 서버로 보내지 않는다.
  // outbox: 올릴 대상 하나당 한 줄. 내용은 담지 않고 보낼 때 행을 읽는다.
  //   attempts/last_error: 서버가 거부한 항목을 보류한다. 대상이 다시 바뀌면 풀린다.
  // 삭제 표식은 서버에만 둔다. 기기는 지금처럼 실제로 지운다.
  [
    `ALTER TABLE goals ADD COLUMN updated_at INTEGER NOT NULL DEFAULT 0;`,
    `ALTER TABLE stickers ADD COLUMN updated_at INTEGER NOT NULL DEFAULT 0;`,
    `ALTER TABLE records ADD COLUMN updated_at INTEGER NOT NULL DEFAULT 0;`,
    `ALTER TABLE records ADD COLUMN photo_remote_path TEXT;`,
    `UPDATE goals SET updated_at = created_at;`,
    `UPDATE stickers SET updated_at = placed_at;`,
    `UPDATE records SET updated_at = created_at;`,
    `CREATE TABLE IF NOT EXISTS outbox (
       entity TEXT NOT NULL CHECK (entity IN ('goal','sticker','record','photo')),
       row_id TEXT NOT NULL,
       queued_at INTEGER NOT NULL,
       attempts INTEGER NOT NULL DEFAULT 0,
       last_error TEXT,
       PRIMARY KEY (entity, row_id)
     );`,
  ],
];

export const SCHEMA_VERSION = MIGRATIONS.length;
