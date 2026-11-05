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

export const INVITE_BASE = 'https://chagok.novum-lab.com/invite/';
export const inviteUrl = (code: string): string => `${INVITE_BASE}${code}`;

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
