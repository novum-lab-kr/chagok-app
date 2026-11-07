/**
 * 버전 단위 마이그레이션.
 * 배열 인덱스 i를 적용하면 스키마 버전이 i+1이 된다.
 *
 * 규칙:
 * - 출시 뒤에는 이미 배포된 버전의 SQL을 절대 수정하지 않는다. 새 버전을 뒤에 붙인다.
 * - 출시 전(2026-11-05)에는 v1을 최종 구조로 고치고 옛 기기를 지운다 — 1.0.0 사용자가 없어 옮길 단계가 필요 없다.
 *   함께 목표(서버 2판)와 같은 모양으로 다시 쓰면서 옛 v1과 v2(내 목표 순서)를 이 v1 하나로 합쳤다(git 기록에 있다).
 *   옛 구조로 연 기기는 client.ts의 migrate가 알아보고 지운 뒤 새로 만든다.
 * - 각 버전 안의 문장은 순서대로 실행된다.
 *
 * Expo SDK 57의 expo-sqlite에는 마이그레이션 헬퍼가 없고 `PRAGMA user_version`으로
 * 직접 추적하는 것이 공식 권장 방식이다.
 * https://docs.expo.dev/versions/v57.0.0/sdk/sqlite/
 */
export const MIGRATIONS: readonly (readonly string[])[] = [
  // goals: 목표 자체의 값. 사람마다 다른 값은 goal_members에 있다.
  //   mode: solo(혼자), each(각자 판), one(한 판), show(보여주기).
  //   owner_id: 내가 만든 목표만 'me'다. 로그인 전 혼자 목표와 다른 사람이 만든 목표는 null이다(다른 사람 id를 남기지 않는다).
  //   end_date: 달력판 종료일. 'YYYY-MM-DD' 로컬 날짜라 시간대 변환 없이 localDateKey와 비교한다.
  //   initial_slots: 적립판을 만들 때의 칸 수. 칸 늘리기의 기본값이다.
  //   max_members: 함께 목표 정원. 혼자 목표는 1.
  //   updated_at: 행 단위 병합의 기준 (계정·백업 설계 ②). goal_members, stickers, records도 같다.
  // goal_members: 목표에 속한 사람마다의 값. 나는 user_id가 'me'다(로그인 전에도 행이 있다. 서버와 주고받을 때만 실제 id로 바꾼다).
  //   sticker_id: 그 사람의 기본 스티커. 컬러 스티커 id(`묶음.이름`)를 저장하고 읽을 때 normalizeStickerId가 컬러로 옮긴다.
  //   sort_order: 내 목표 목록 순서, 작을수록 위 (PRD 4.1). null = 순서를 정하기 전 기록.
  //   completed_at: 완성한 시각. NULL이면 진행 중이다.
  //   completion_seen: 완성 뒤 닫기/계속하기를 골랐는가. 0인 완성한 판은 열 때 완성 흐름을 보여준다.
  //   last_placed_at: 마지막으로 붙인 시각. 떼도 바꾸지 않으므로 stickers에서 계산할 수 없다.
  // stickers
  //   date_key·tz_offset_min: 붙인 날짜 'YYYY-MM-DD'와 그때 기기 시간대(분, 한국 540) (PRD 4.5).
  //   달력 칸·기록 날짜는 date_key로 정한다 — 다른 시간대에서 열어도 칸이 밀리지 않는다.
  //   board_user_id: 어느 판에 붙었는가. 내 판은 'me', 한 판(one)은 null, 친구 판은 그 사람 id.
  //   placed_by: 붙인 사람. 'me' 또는 그 사람 id, 차단으로 가려지면 null. 그때 sticker_type도 null이다.
  // records
  //   photo_remote_path: 서버 Storage 경로. 기기 경로(photo_uri)는 서버로 보내지 않는다.
  //   visibility: 늘 'self'. 함께 목표 공개 범위는 다음 단계에서 정한다.
  // app_settings: 튜토리얼 완료 같은 앱 설정 (PRD 4.6). 계정 백업을 따라간다.
  // outbox: 올릴 대상 하나당 한 줄. 내용은 담지 않고 보낼 때 행을 읽는다.
  //   attempts/last_error: 서버가 거부한 항목을 보류한다. 대상이 다시 바뀌면 풀린다.
  //   삭제 표식은 서버에만 둔다. 기기는 실제로 지운다.
  // pack_access: 이 기기에서 쓸 수 있는 묶음. 산 묶음은 expires_at null. 서버로 올리지 않는다.
  // placed_days: 스티커를 누른 로컬 날짜. 붙인 날 체험(7·14·이후 30일마다)을 센다. 떼도 지우지 않는다.
  //   달력판 지난 칸은 그 날짜로 붙지만 누른 날은 오늘이다 — 몰아 채워도 하루 (2026-10-08 사용자 확인).
  [
    `CREATE TABLE IF NOT EXISTS goals (
       id TEXT PRIMARY KEY NOT NULL,
       mode TEXT NOT NULL DEFAULT 'solo' CHECK (mode IN ('solo','each','one','show')),
       owner_id TEXT,
       name TEXT NOT NULL,
       board_type TEXT NOT NULL CHECK (board_type IN ('calendar','tally')),
       total_slots INTEGER,
       initial_slots INTEGER,
       end_date TEXT,
       max_members INTEGER NOT NULL DEFAULT 1,
       created_at INTEGER NOT NULL,
       updated_at INTEGER NOT NULL DEFAULT 0
     );`,
    `CREATE TABLE IF NOT EXISTS goal_members (
       goal_id TEXT NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
       user_id TEXT NOT NULL,
       role TEXT NOT NULL CHECK (role IN ('owner','member','viewer')),
       display_name TEXT,
       sticker_id TEXT,
       sort_order INTEGER,
       completed_at INTEGER,
       completion_seen INTEGER NOT NULL DEFAULT 0,
       last_placed_at INTEGER,
       joined_at INTEGER,
       updated_at INTEGER NOT NULL DEFAULT 0,
       PRIMARY KEY (goal_id, user_id)
     );`,
    `CREATE TABLE IF NOT EXISTS stickers (
       id TEXT PRIMARY KEY NOT NULL,
       goal_id TEXT NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
       placed_at INTEGER NOT NULL,
       slot_index INTEGER NOT NULL,
       sticker_type TEXT DEFAULT 'basic.sprout',
       updated_at INTEGER NOT NULL DEFAULT 0,
       date_key TEXT NOT NULL,
       tz_offset_min INTEGER NOT NULL,
       board_user_id TEXT,
       placed_by TEXT
     );`,
    `CREATE INDEX IF NOT EXISTS idx_stickers_goal ON stickers(goal_id);`,
    `CREATE INDEX IF NOT EXISTS idx_stickers_goal_date ON stickers(goal_id, date_key);`,
    `CREATE INDEX IF NOT EXISTS idx_stickers_goal_board ON stickers(goal_id, board_user_id);`,
    `CREATE TABLE IF NOT EXISTS records (
       id TEXT PRIMARY KEY NOT NULL,
       sticker_id TEXT NOT NULL UNIQUE REFERENCES stickers(id) ON DELETE CASCADE,
       photo_uri TEXT,
       memo TEXT,
       created_at INTEGER NOT NULL,
       updated_at INTEGER NOT NULL DEFAULT 0,
       photo_remote_path TEXT,
       visibility TEXT NOT NULL DEFAULT 'self'
     );`,
    `CREATE TABLE IF NOT EXISTS app_settings (
       key TEXT PRIMARY KEY NOT NULL,
       value TEXT NOT NULL
     );`,
    `CREATE TABLE IF NOT EXISTS outbox (
       entity TEXT NOT NULL CHECK (entity IN ('goal','member','sticker','record','photo')),
       row_id TEXT NOT NULL,
       queued_at INTEGER NOT NULL,
       attempts INTEGER NOT NULL DEFAULT 0,
       last_error TEXT,
       PRIMARY KEY (entity, row_id)
     );`,
    `CREATE TABLE IF NOT EXISTS pack_access (
       pack_id TEXT PRIMARY KEY,
       source TEXT NOT NULL CHECK (source IN ('purchase','ad','days')),
       granted_at INTEGER NOT NULL,
       expires_at INTEGER
     );`,
    `CREATE TABLE IF NOT EXISTS placed_days (date_key TEXT PRIMARY KEY);`,
  ],
];

export const SCHEMA_VERSION = MIGRATIONS.length;
