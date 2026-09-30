/**
 * 서버 계약. 실제 구현은 Supabase RPC(push_changes, pull_changes, server_state, replace_all)와 1:1이다
 * (계정·백업 설계 ③). 행은 기기 DB 컬럼 이름 그대로다. 기기 경로 photo_uri는 서버로 보내지 않는다.
 */
export type GoalRow = {
  id: string; name: string; board_type: 'calendar' | 'tally'; total_slots: number | null; default_sticker_id: string;
  created_at: number; end_date: string | null; completed_at: number | null; completion_seen: number;
  last_placed_at: number | null; initial_slots: number | null; updated_at: number;
};
export type StickerRow = { id: string; goal_id: string; placed_at: number; slot_index: number; sticker_type: string; updated_at: number };
export type RecordRow = { id: string; sticker_id: string; memo: string | null; photo_remote_path: string | null; created_at: number; updated_at: number };

export type RowEntity = 'goal' | 'sticker' | 'record';

export type Change =
  | { entity: 'goal'; op: 'upsert'; row: GoalRow }
  | { entity: 'sticker'; op: 'upsert'; row: StickerRow }
  | { entity: 'record'; op: 'upsert'; row: RecordRow }
  | { entity: RowEntity; op: 'delete'; id: string; deletedAt: number };

export type PulledRow =
  | { entity: 'goal'; row: GoalRow; deletedAt: number | null }
  | { entity: 'sticker'; row: StickerRow; deletedAt: number | null }
  | { entity: 'record'; row: RecordRow; deletedAt: number | null };

/** 서버가 내용 때문에 거부했다(형식 오류 등). 네트워크 오류와 구분한다 — 이것만 보류 대상이다. */
export class SyncRejected extends Error {}

/** 사진 자체가 문제다(디코딩 실패, 크기 거부 등). 다시 보내도 같으므로 그 사진만 보류한다. */
export class PhotoRejected extends Error {}

export interface SyncServer {
  /** 한 트랜잭션으로 반영. 더 최근 updated_at 우선, 목표·스티커 삭제는 딸린 행까지 표식, 멱등. */
  push(deviceId: string, changes: Change[]): Promise<void>;
  /** since 이후 바뀐 행(표식 포함). cursor를 다음 since로 쓴다. */
  pull(since: number, limit: number): Promise<{ rows: PulledRow[]; cursor: number; more: boolean }>;
  state(): Promise<{ goals: number; lastUpdatedAt: number | null }>;
  /** 기존 행 전부 표식 + 새 행 삽입을 한 트랜잭션으로 ("이 기기 기록 유지"). */
  replaceAll(deviceId: string, rows: { goals: GoalRow[]; stickers: StickerRow[]; records: RecordRow[] }): Promise<void>;
}

export interface PhotoStore {
  /** 기기 사진을 줄여(긴 변 1600px, JPEG 80%) 올리고 서버 경로를 돌려준다. 기기 파일이 없으면 null. */
  upload(recordId: string, storedUri: string): Promise<string | null>;
  remove(recordId: string): Promise<void>;
  /** 받아서 기기에 두고 저장용 URI('record-photo:...')를 돌려준다. */
  download(remotePath: string, recordId: string): Promise<string>;
}
