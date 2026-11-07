import { t } from '../i18n';
import type { RpcClient } from './supabaseServer';

/**
 * 함께 목표 RPC와 표 읽기 (supabase/migrations/20261105000004_api_v2.sql). 서버 호출은 여기 한 곳이다.
 * 함수 이름과 인자는 SQL 그대로, 돌려받은 키만 camelCase로 바꾼다. 실패는 SharedGoalError로 던지고
 * 화면이 errorMessage로 보인다. 기기 DB를 맞추는 일(다시 받기)은 하지 않는다 — app-data/sharedGoalActions.ts가 한다.
 */

type Rows = PromiseLike<{ data: unknown; error: { code?: string; message: string } | null }>;
/** 표 읽기에서 쓰는 부분(select, eq, is, maybeSingle). 테스트에서 바꿔 끼운다. */
type Filter = { eq(column: string, value: string): Filter; is(column: string, value: null): Filter; maybeSingle(): Rows };
export type SharedClient = RpcClient & { from(table: 'member_defaults' | 'invites'): { select(columns: string): Filter } };

/** 서버 실패 낱말. P0001의 메시지(private.fail)와 22023의 메시지가 그대로 온다. needs_login, network는 앱이 붙인다. */
export type ErrorWord =
  | 'not_member' | 'not_shared' | 'not_owner' | 'full' | 'closed' | 'sticker_taken' | 'name_not_allowed'
  | 'invalid_name' | 'invalid_sticker' | 'invalid_input' | 'rate_limited' | 'needs_login' | 'network';

export class SharedGoalError extends Error {
  constructor(readonly word: ErrorWord) {
    super(word);
    this.name = 'SharedGoalError';
  }
}

const SERVER_WORDS: readonly ErrorWord[] = [
  'not_member', 'not_shared', 'not_owner', 'full', 'closed', 'sticker_taken', 'name_not_allowed', 'rate_limited',
  'invalid_name', 'invalid_sticker', 'invalid_input',
];

/** P0001과 22023은 메시지가 낱말이다. 42501(로그인 필요)은 needs_login, 그 밖(네트워크, 서버 장애, 모르는 메시지)은 network. */
export function errorWordOf(error: { code?: string; message: string }): ErrorWord {
  if ((error.code === 'P0001' || error.code === '22023') && SERVER_WORDS.includes(error.message as ErrorWord)) {
    return error.message as ErrorWord;
  }
  return error.code === '42501' ? 'needs_login' : 'network';
}

/** 낱말 → 화면 문구. 로그인 권하기는 화면이 needs_login을 따로 보고 정하므로 여기서는 연결 확인 문구다. */
export function errorMessage(word: ErrorWord): string {
  switch (word) {
    case 'name_not_allowed': return t('validation.nameNotAllowed');
    case 'sticker_taken': return t('validation.stickerTaken');
    case 'rate_limited': return t('together.tryLater');
    case 'not_member':
    case 'not_shared': return t('together.goneTitle');
    case 'not_owner': return t('together.ownerOnly');
    case 'full': return t('invite.fullTitle');
    case 'closed': return t('invite.closedTitle');
    case 'invalid_name': return t('validation.memberNameEmpty');
    // invalid_sticker, invalid_input은 맞는 기존 문구가 없다(화면이 입력을 먼저 막아 거의 닿지 않는다). 문구는 사용자 확인 뒤에 정한다
    default: return t('account.checkInternetRetry');
  }
}

/** 운영 초대 주소. 앱 링크(ios.associatedDomains)와 웹 초대 페이지(novum-web chagok/invite/)가 이 주소에 있다 */
export const INVITE_BASE = 'https://chagok.novum-lab.com/invite/';
/**
 * 초대 주소의 앞부분. 개발 환경은 .env.local의 EXPO_PUBLIC_INVITE_BASE(https://chagok-dev.novum-lab.com/invite/)로
 * 개발 사이트를 쓴다(그 페이지는 개발 서버를 읽는다, 2026-11-06). 값이 없으면(출시 빌드) 운영 주소다.
 */
export const inviteBase = (fromEnv: string | undefined = process.env.EXPO_PUBLIC_INVITE_BASE): string =>
  fromEnv && /^https:\/\/[^/]+\/invite\/$/.test(fromEnv) ? fromEnv : INVITE_BASE;
export const inviteUrl = (code: string): string => `${inviteBase()}${code}`;

async function call<T>(c: RpcClient, fn: string, args: Record<string, unknown>): Promise<T> {
  let result: Awaited<ReturnType<RpcClient['rpc']>>;
  try {
    result = await c.rpc(fn, args);
  } catch {
    throw new SharedGoalError('network'); // 요청이 서버에 닿기 전에 실패했다
  }
  if (result.error) throw new SharedGoalError(errorWordOf(result.error));
  return result.data as T;
}

/** 초대 코드 모양: 헷갈리는 글자(I, O, 0, 1)를 뺀 8자리(2026-11-06 전) 또는 12자리. 서버 invites.code 검사와 같다 */
const INVITE_CODE = /^[A-HJ-NP-Z2-9]{8}(?:[A-HJ-NP-Z2-9]{4})?$/;
/** 초대 경로(/invite/<코드>)의 코드. 모양이 맞지 않으면 null(들어갈 수 없는 초대로 보인다) */
export function inviteCodeFromPath(raw: string | string[] | undefined): string | null {
  const value = (Array.isArray(raw) ? raw[0] : raw)?.trim().toUpperCase() ?? '';
  return INVITE_CODE.test(value) ? value : null;
}
const normalizeCode = (code: string) => code.trim().toUpperCase();

export type InvitePreview =
  | { status: 'closed' | 'full' | 'rate_limited' }
  | {
      status: 'open'; goalName: string; mode: 'each' | 'one'; boardType: 'tally' | 'calendar'; totalSlots: number | null;
      endDate: string | null; ownerName: string | null; memberCount: number; maxMembers: number; takenStickers: string[];
      /** 로그인한 내가 이미 이 목표에 들었으면 그 목표 id(20261106000004). 쓰는 스티커에는 내 것이 빠져 있다 */
      memberGoalId: string | null;
    };

/**
 * 초대 미리보기(로그인 없이 부를 수 있다). closed: 없는 코드, 끈 코드, 지운 목표. rate_limited: 한 곳에서 없는 코드를
 * 너무 많이 넣었다(20261106000001). 모르는 상태는 closed로 본다.
 */
export async function previewInvite(c: RpcClient, code: string): Promise<InvitePreview> {
  type Raw = {
    status: string; goal?: { name: string; mode: 'each' | 'one'; board_type: 'tally' | 'calendar'; total_slots: number | null; end_date: string | null };
    owner_name?: string | null; member_count?: number; max_members?: number; taken_stickers?: string[];
    member?: boolean; goal_id?: string;
  };
  const r = await call<Raw>(c, 'preview_invite', { p_code: normalizeCode(code) });
  if (r.status === 'open' && r.goal) {
    return {
      status: 'open', goalName: r.goal.name, mode: r.goal.mode, boardType: r.goal.board_type, totalSlots: r.goal.total_slots,
      endDate: r.goal.end_date, ownerName: r.owner_name ?? null, memberCount: r.member_count ?? 0, maxMembers: r.max_members ?? 0,
      takenStickers: r.taken_stickers ?? [], memberGoalId: r.member && r.goal_id ? r.goal_id : null,
    };
  }
  return { status: r.status === 'full' || r.status === 'rate_limited' ? r.status : 'closed' };
}

/** 초대로 들어간다. 이미 멤버면 그대로 성공. 서버는 실패를 오류가 아니라 값 {error}로 돌려준다(시도 기록을 남겨야 해서). */
export async function joinGoal(c: RpcClient, code: string, displayName: string, stickerId: string): Promise<{ goalId: string }> {
  const r = await call<{ goal_id?: string; error?: string }>(c, 'join_goal', {
    p_code: normalizeCode(code), p_display_name: displayName, p_sticker_id: stickerId,
  });
  if (r.goal_id) return { goalId: r.goal_id };
  throw new SharedGoalError(SERVER_WORDS.includes(r.error as ErrorWord) ? r.error as ErrorWord : 'network');
}

export async function createSharedGoal(
  c: SharedClient,
  input: {
    goalId: string; mode: 'each' | 'one'; name: string; boardType: 'tally' | 'calendar'; totalSlots: number | null;
    endDate: string | null; displayName: string; stickerId: string;
  },
): Promise<{ goalId: string; inviteCode: string }> {
  const r = await call<{ goal_id: string; invite_code: string }>(c, 'create_shared_goal', {
    p_mode: input.mode, p_name: input.name, p_board_type: input.boardType, p_total_slots: input.totalSlots,
    p_end_date: input.endDate, p_display_name: input.displayName, p_sticker_id: input.stickerId, p_goal_id: input.goalId,
  });
  return { goalId: r.goal_id, inviteCode: r.invite_code };
}

export async function updateMember(c: RpcClient, goalId: string, displayName: string, stickerId: string): Promise<void> {
  await call(c, 'update_member', { p_goal_id: goalId, p_display_name: displayName, p_sticker_id: stickerId });
}

export async function updateSharedGoal(
  c: RpcClient, goalId: string, v: { name: string; totalSlots: number | null; endDate: string | null },
): Promise<void> {
  await call(c, 'update_goal', { p_goal_id: goalId, p_name: v.name, p_total_slots: v.totalSlots, p_end_date: v.endDate });
}

export async function rotateInvite(c: RpcClient, goalId: string): Promise<string> {
  return (await call<{ invite_code: string }>(c, 'rotate_invite', { p_goal_id: goalId })).invite_code;
}

export async function leaveSharedGoal(c: RpcClient, goalId: string): Promise<{ soloGoalId: string | null }> {
  const r = await call<{ solo_goal_id: string | null }>(c, 'leave_goal', { p_goal_id: goalId });
  return { soloGoalId: r.solo_goal_id };
}

export async function kickMember(c: RpcClient, goalId: string, userId: string): Promise<void> {
  await call(c, 'kick_member', { p_goal_id: goalId, p_user_id: userId });
}

export async function blockUser(c: RpcClient, userId: string): Promise<void> {
  await call(c, 'block_user', { p_user_id: userId });
}

export async function unblockUser(c: RpcClient, userId: string): Promise<void> {
  await call(c, 'unblock_user', { p_user_id: userId });
}

/** 내가 차단한 사람. 최근 차단 먼저. 이름은 차단할 때 남긴 이름이라 null일 수 있다. */
export async function myBlocks(c: RpcClient): Promise<{ userId: string; displayName: string | null; createdAt: number }[]> {
  const rows = await call<{ user_id: string; display_name: string | null; created_at: number }[]>(c, 'my_blocks', {});
  return rows.map((r) => ({ userId: r.user_id, displayName: r.display_name, createdAt: r.created_at }));
}

export async function reportGoal(c: RpcClient, goalId: string, targetUserId: string | null, reason: 'name'): Promise<void> {
  await call(c, 'report', { p_goal_id: goalId, p_target_user_id: targetUserId, p_reason: reason });
}

async function readOne<T>(query: Filter): Promise<T | null> {
  let result: Awaited<Rows>;
  try {
    result = await query.maybeSingle();
  } catch {
    throw new SharedGoalError('network');
  }
  if (result.error) throw new SharedGoalError(errorWordOf(result.error));
  return (result.data as T | null) ?? null;
}

/** 지난번에 쓴 내 이름과 스티커(표 member_defaults, 내 행만 보인다). 없으면 null. */
export async function readMemberDefaults(c: SharedClient): Promise<{ displayName: string; stickerId: string } | null> {
  const row = await readOne<{ display_name: string; sticker_id: string }>(c.from('member_defaults').select('display_name, sticker_id'));
  return row ? { displayName: row.display_name, stickerId: row.sticker_id } : null;
}

/** 지금 쓰는 초대 코드(표 invites, 끈 것은 뺀다. 만든 사람만 볼 수 있다). 없으면 null. */
export async function readInviteCode(c: SharedClient, goalId: string): Promise<string | null> {
  const row = await readOne<{ code: string }>(c.from('invites').select('code').eq('goal_id', goalId).is('revoked_at', null));
  return row ? row.code : null;
}
