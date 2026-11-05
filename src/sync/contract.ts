import type { GoalMode, MemberRole } from '../domain/types';

/**
 * 서버 계약 2판. 실제 구현은 Supabase RPC(sync_push, sync_pull, pull_goal, server_state, replace_all)와 1:1이다
 * (supabase/migrations/20261105000004_api_v2.sql 머리 주석이 동기화 규칙). 기기 경로 photo_uri는 서버로 보내지 않는다.
 * server_state, replace_all은 1.1.0 호환 함수(20261105000003_api_v1.sql)를 그대로 쓴다. 혼자 목표만 다룬다.
 */

/** 혼자 목표 한 줄(1.1.0 목표 행 모양). 목표 자체와 내 멤버 행 값을 합친다. sync_push의 goal, replace_all이 받는다. */
export type GoalRow = {
  id: string; name: string; board_type: 'calendar' | 'tally'; total_slots: number | null; default_sticker_id: string;
  created_at: number; end_date: string | null; completed_at: number | null; completion_seen: number;
  last_placed_at: number | null; initial_slots: number | null; updated_at: number;
  /**
   * 내 목표 순서, 작을수록 위 (PRD 4.1, 2026-10-30). 서버에 칸이 생기기 전 기록에는 없거나 null이다 —
   * 복원할 때 첫 순서 규칙(최근순)으로 채운다. 이 키 없이 올려도 서버는 저장된 값을 지우지 않는다.
   */
  sort_order?: number | null;
};
export type StickerRow = {
  id: string; goal_id: string; placed_at: number; slot_index: number; sticker_type: string; updated_at: number;
  /** 붙인 날짜 'YYYY-MM-DD'와 그때 시간대(분). 서버는 date, smallint로 둔다 (PRD 4.5) */
  date_key: string; tz_offset_min: number;
};
export type RecordRow = { id: string; sticker_id: string; memo: string | null; photo_remote_path: string | null; created_at: number; updated_at: number };

// 받는 행 모양(api_v2.sql goal_json, member_json, sticker_json, record_json 그대로). 사용자 id는 서버 id다.
export type V2GoalRow = {
  id: string; client_id: string | null; mode: GoalMode; owner_id: string; name: string;
  board_type: 'calendar' | 'tally'; total_slots: number | null; initial_slots: number | null; end_date: string | null;
  max_members: number; created_at: number; updated_at: number;
  /** pull_goal만 싣는다 */
  deleted_at?: number | null;
};
/** 순서, 완성, 마지막으로 붙인 시각, left_reason은 내 행에만 있다(다른 사람에게는 보이지 않는다). */
export type V2MemberRow = {
  goal_id: string; user_id: string; role: MemberRole; display_name: string | null;
  sticker_id: string | null; joined_at: number | null; left_at: number | null; updated_at: number;
  sort_order?: number | null; completed_at?: number | null; completion_seen?: number; last_placed_at?: number | null;
  left_reason?: 'left' | 'kicked' | null;
};
/** 나간 사람, 내보내진 사람, 나와 차단 관계인 사람. 셋을 가르지 않는다. */
export type GoneMember = { goal_id: string; user_id: string; gone: true };
/** 차단 관계인 사람이 붙인 칸은 placed_by와 sticker_type이 null이다(이름 없는 흐린 칸). */
export type V2StickerRow = {
  id: string; client_id: string | null; goal_id: string; board_user_id: string | null;
  slot_index: number; date_key: string; tz_offset_min: number; placed_at: number; updated_at: number;
  placed_by: string | null; sticker_type: string | null;
};
export type V2RecordRow = RecordRow & { client_id: string | null; visibility: 'self' | 'members' };

/** 올리는 내 멤버 행. sticker_id는 혼자 목표만(함께 목표의 스티커는 update_member로 바꾼다). */
export type MemberChangeRow = {
  goal_id: string; sort_order: number | null; completed_at: number | null;
  completion_seen: number; last_placed_at: number | null; updated_at: number; sticker_id?: string;
};

export type V2Change =
  | { entity: 'goal'; op: 'upsert'; row: GoalRow }
  | { entity: 'member'; op: 'upsert'; row: MemberChangeRow }
  | { entity: 'sticker'; op: 'upsert'; row: StickerRow }
  | { entity: 'record'; op: 'upsert'; row: RecordRow }
  | { entity: 'goal' | 'sticker' | 'record'; op: 'delete'; id: string; deletedAt: number };

/** 그 행만 빠지고 나머지는 반영됐다. member의 id는 목표 id다. */
/** out_of_period: 함께 목표 달력판에서 목표 기간 밖 날짜(20261105000007). 다시 보내도 받지 않는다 */
export type PushRejection = { entity: string; id: string; reason: 'slot_taken' | 'not_allowed' | 'out_of_period' };

export type V2Pulled =
  | { entity: 'goal'; row: V2GoalRow; deletedAt: number | null }
  | { entity: 'member'; row: V2MemberRow | GoneMember; deletedAt: number | null }
  | { entity: 'sticker'; row: V2StickerRow; deletedAt: number | null }
  | { entity: 'record'; row: V2RecordRow; deletedAt: number | null };

/** 목표 하나의 지금 상태 전체(pull_goal). records는 이 목표의 내 기록. */
export type GoalSnapshot = { goal: V2GoalRow; members: V2MemberRow[]; stickers: V2StickerRow[]; records: V2RecordRow[] };

/** 서버가 내용 때문에 묶음 전체를 거부했다(형식 오류, 부모 없음 등). 네트워크 오류와 구분한다 — 이것만 보류 대상이다. */
export class SyncRejected extends Error {}

/** pull_goal: 그 목표의 나가지 않은 멤버가 아니다(나갔거나 내보내졌거나 목표가 없다). */
export class NotMember extends Error {}

/** 사진 자체가 문제다(디코딩 실패, 크기 거부 등). 다시 보내도 같으므로 그 사진만 보류한다. */
export class PhotoRejected extends Error {}

export interface SyncServer {
  /** sync_push. 한 트랜잭션, 더 최근 updated_at 우선, 멱등. 내 행이 아니거나 칸이 겹치거나 기간 밖 날짜인 행만 rejected로 빠진다. */
  push(deviceId: string, changes: V2Change[]): Promise<{ rejected: PushRejection[] }>;
  /** sync_pull. since 이후 바뀐 행(지운 표시 포함). cursor를 다음 since로 쓴다. */
  pull(since: number, limit: number): Promise<{ rows: V2Pulled[]; cursor: number; more: boolean }>;
  /** pull_goal. 멤버가 아니면 NotMember. */
  pullGoal(goalId: string): Promise<GoalSnapshot>;
  /** server_state. 내 혼자 목표 수와 마지막 수정 시각. */
  state(): Promise<{ goals: number; lastUpdatedAt: number | null }>;
  /** replace_all. 내 혼자 목표를 모두 지운 표시 뒤 보낸 행을 쓴다, 한 트랜잭션 ("이 기기 기록 유지"). */
  replaceAll(deviceId: string, rows: { goals: GoalRow[]; stickers: StickerRow[]; records: RecordRow[] }): Promise<void>;
}

export interface PhotoStore {
  /** 기기 사진을 줄여(긴 변 1600px, JPEG 80%) 올리고 서버 경로를 돌려준다. 기기 파일이 없으면 null. */
  upload(recordId: string, storedUri: string): Promise<string | null>;
  remove(recordId: string): Promise<void>;
  /** 받아서 기기에 두고 저장용 URI('record-photo:...')를 돌려준다. */
  download(remotePath: string, recordId: string): Promise<string>;
}
