import { Share } from 'react-native';
import { t } from '../i18n';
import { deleteGoal } from '../repositories/goalRepository';
import { listGoalsWith } from '../repositories/memberRepository';
import { getSupabase } from '../sync/supabaseClient';
import { syncDepsFor } from '../sync/appSync';
import { refetchGoal } from '../sync/pull';
import { pushOnce } from '../sync/push';
import type { PushDeps } from '../sync/push';
import {
  blockUser, createSharedGoal, inviteUrl, kickMember, leaveSharedGoal, readInviteCode, rotateInvite, unblockUser,
  updateMember, updateSharedGoal,
} from '../sync/sharedGoals';
import type { SharedClient } from '../sync/sharedGoals';
import { requestSync } from '../sync/syncGate';
import { removeManagedRecordPhoto } from './recordPhotos';

/**
 * 화면이 부르는 함께 목표 동작. 서버 호출은 sync/sharedGoals.ts가 하고, 여기서는 부르는 순서를 정한다:
 * 올려야 하는 것은 먼저 올리고, 부른 뒤에는 그 목표를 다시 받아 기기 DB를 맞춘다. 화면은 기기 DB만 읽는다.
 * 실패는 SharedGoalError로 던진다(화면이 errorMessage로 보인다). 다시 받기만 실패한 것은 던지지 않고
 * 다음 동기화 회차(requestSync)에 맡긴다 — 서버에서는 이미 끝났기 때문이다.
 */
export type ActionDeps = {
  client: SharedClient; userId: string; sync: PushDeps; currentUserId: () => Promise<string | null>;
};

/** 로그인한 사용자 기준 구성. 서버 설정이 없거나 세션이 없으면 null이다(화면이 로그인을 권한다). */
export async function actionDeps(): Promise<ActionDeps | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const userId = (await supabase.auth.getSession()).data.session?.user.id;
  if (!userId) return null;
  const currentUserId = async () => (await supabase.auth.getSession()).data.session?.user.id ?? null;
  return {
    // supabase-js의 표 읽기 모양이 SharedClient의 최소 모양보다 크다. 쓰는 부분(select, eq, is, maybeSingle)만 맞으면 된다
    client: supabase as unknown as SharedClient,
    userId,
    currentUserId,
    sync: { ...(await syncDepsFor(supabase, userId)), userId, currentUserId },
  };
}

/** 목표 하나를 서버 것으로 다시 받는다. 실패하면 다음 회차가 받도록 깨우고 false를 돌려준다. */
async function tryRefetch(d: ActionDeps, goalId: string): Promise<boolean> {
  try {
    const { removedPhotoUris } = await refetchGoal({ server: d.sync.server, userId: d.userId, currentUserId: d.currentUserId }, goalId);
    for (const uri of removedPhotoUris) {
      try { removeManagedRecordPhoto(uri); } catch { /* 고아 파일로 남는다. 기록은 이미 지워졌다 */ }
    }
    return true;
  } catch {
    requestSync();
    return false;
  }
}

/** 함께 목표를 만든다. onDevice가 false면 기기에는 다음 회차가 내 멤버 행을 보고 받아 온다. */
export async function createAndFetch(
  d: ActionDeps, input: Parameters<typeof createSharedGoal>[1],
): Promise<{ goalId: string; inviteUrl: string; onDevice: boolean }> {
  const { goalId, inviteCode } = await createSharedGoal(d.client, input);
  return { goalId, inviteUrl: inviteUrl(inviteCode), onDevice: await tryRefetch(d, goalId) };
}

/** 내 이름과 스티커를 바꾼다. */
export async function saveMine(d: ActionDeps, goalId: string, displayName: string, stickerId: string): Promise<void> {
  await updateMember(d.client, goalId, displayName, stickerId);
  await tryRefetch(d, goalId);
}

/** 목표 이름과 칸 수, 종료일을 바꾼다(만든 사람만). */
export async function saveGoal(
  d: ActionDeps, goalId: string, v: Parameters<typeof updateSharedGoal>[2],
): Promise<void> {
  await updateSharedGoal(d.client, goalId, v);
  await tryRefetch(d, goalId);
}

/**
 * 나간다. 안 올린 내 칸이 새 혼자 목표로 옮겨지도록 먼저 올린다 — 올리기가 실패하면 나가지 않는다.
 * 나간 목표는 기기에서 지워지고(서버가 NotMember), 각자 판이면 옮겨 간 새 혼자 목표를 받는다.
 */
export async function leave(d: ActionDeps, goalId: string): Promise<{ soloGoalId: string | null }> {
  await pushOnce(d.sync);
  const { soloGoalId } = await leaveSharedGoal(d.client, goalId);
  await tryRefetch(d, goalId);
  if (soloGoalId) await tryRefetch(d, soloGoalId);
  return { soloGoalId };
}

/** 나가고, 옮겨 온 새 혼자 목표(내 판)까지 지운다. 지운 기록의 기기 사진 경로를 돌려준다. */
export async function removeAsOwner(d: ActionDeps, goalId: string): Promise<string[]> {
  const { soloGoalId } = await leave(d, goalId);
  return soloGoalId ? deleteGoal(soloGoalId) : [];
}

/** 내보낸다(만든 사람만). */
export async function kick(d: ActionDeps, goalId: string, userId: string): Promise<void> {
  await kickMember(d.client, goalId, userId);
  await tryRefetch(d, goalId);
}

/** 차단한다. 서버가 차단 관계인 사람과 그 판을 빼고 주므로, 그 사람이 있는 목표마다 다시 받는다. */
export async function block(d: ActionDeps, userId: string): Promise<void> {
  await blockUser(d.client, userId);
  for (const goalId of await listGoalsWith(userId)) await tryRefetch(d, goalId);
}

/** 차단을 푼다. 서버가 목표 행 순번을 바꿔 다음 회차가 다시 받는다. */
export async function unblock(d: ActionDeps, userId: string): Promise<void> {
  await unblockUser(d.client, userId);
  requestSync();
}

/** 초대 링크를 OS 공유 창으로 보낸다. 쓰는 코드가 없으면 false. 코드는 기기에 두지 않고 그때그때 읽는다. */
export async function shareInvite(d: ActionDeps, goalId: string, goalName: string): Promise<boolean> {
  const code = await readInviteCode(d.client, goalId);
  if (!code) return false;
  await shareLink(goalName, code);
  return true;
}

/** 초대 링크를 새로 만들고(옛 링크는 꺼진다) 바로 공유 창을 연다. */
export async function rotateAndShare(d: ActionDeps, goalId: string, goalName: string): Promise<void> {
  await shareLink(goalName, await rotateInvite(d.client, goalId));
}

// 메시지 안의 주소를 메신저가 링크로 읽으므로 iOS에도 url을 따로 주지 않는다
const shareLink = (goalName: string, code: string) => Share.share({ message: t('together.shareMessage', goalName, inviteUrl(code)) });
