import { Share } from 'react-native';
import { t } from '../i18n';
import { deleteGoal, getGoal } from '../repositories/goalRepository';
import { listGoalsWith } from '../repositories/memberRepository';
import { getSupabase } from '../sync/supabaseClient';
import { syncDepsFor } from '../sync/appSync';
import { AccountChanged, refetchGoal } from '../sync/pull';
import { pushOnce } from '../sync/push';
import type { PushDeps } from '../sync/push';
import {
  blockUser, createSharedGoal, inviteUrl, joinGoal, kickMember, leaveSharedGoal, myBlocks, readInviteCode, reportGoal, rotateInvite,
  SharedGoalError, unblockUser, updateMember, updateSharedGoal,
  type ErrorWord, type SharedClient,
} from '../sync/sharedGoals';
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
  /** 서버가 지운 기록의 사진 파일을 저장소에서 지우게 한다(Edge Function purge-photos). 없으면 부르지 않는다 */
  purgePhotos?: () => Promise<unknown>;
  /** 아직 알리지 않은 신고를 운영자 메일로 보내게 한다(Edge Function report-notify). 없으면 부르지 않는다 */
  notifyReports?: () => Promise<unknown>;
};

/** 로그인한 사용자 id. 서버 설정이 없거나 세션이 없으면 null이다(화면이 로그인을 권한다). */
export async function signedInUserId(): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  return (await supabase.auth.getSession()).data.session?.user.id ?? null;
}

/** 로그인한 사용자 기준 구성. 서버 설정이 없거나 세션이 없으면 null이다(화면이 로그인을 권한다). */
export async function actionDeps(): Promise<ActionDeps | null> {
  const supabase = getSupabase();
  const userId = await signedInUserId();
  if (!supabase || !userId) return null;
  const currentUserId = signedInUserId;
  return {
    // supabase-js의 표 읽기 모양이 SharedClient의 최소 모양보다 크다. 쓰는 부분(select, eq, is, maybeSingle)만 맞으면 된다
    client: supabase as unknown as SharedClient,
    userId,
    currentUserId,
    sync: { ...(await syncDepsFor(supabase, userId)), userId, currentUserId },
    purgePhotos: () => supabase.functions.invoke('purge-photos'),
    notifyReports: () => supabase.functions.invoke('report-notify'),
  };
}

/**
 * 나가기, 내보내기, 차단으로 서버의 기록 행이 지워진 뒤 부른다. 서버는 지운 기록의 사진 경로를 모아 두고
 * purge-photos가 저장소에서 지운다(20261105000006_together_fixes.sql). 기다리지 않고, 실패하면 다음에 부를 때 함께 지운다.
 */
function purgeServerPhotos(d: ActionDeps): void {
  d.purgePhotos?.().catch(() => { /* 모아 둔 경로는 서버에 남아 다음 호출이 지운다 */ });
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

/** 기기가 서버보다 늦었다는 낱말: 만든 사람이 바뀌었거나(not_owner), 목표가 지워졌거나 내가 나왔다(not_member, not_shared). */
const STALE: readonly ErrorWord[] = ['not_owner', 'not_member', 'not_shared'];

/**
 * 그 목표에 대한 호출. 서버가 기기와 다르다고 답하면 다시 받아 맞춘 뒤 같은 오류를 던진다 —
 * 화면이 창을 띄운 뒤 다시 읽으면 바뀐 역할이 보이고, 나온 목표는 기기에서 지워져 있다.
 */
async function onGoal<T>(
  d: ActionDeps, goalId: string, run: () => Promise<T>, onRefetched?: (ok: boolean) => void,
): Promise<T> {
  try {
    return await run();
  } catch (error) {
    if (error instanceof SharedGoalError && STALE.includes(error.word)) {
      const ok = await tryRefetch(d, goalId);
      onRefetched?.(ok);
    }
    throw error;
  }
}

/** 함께 목표를 만든다. onDevice가 false면 기기에는 다음 회차가 내 멤버 행을 보고 받아 온다. */
export async function createAndFetch(
  d: ActionDeps, input: Parameters<typeof createSharedGoal>[1],
): Promise<{ goalId: string; inviteUrl: string; onDevice: boolean }> {
  const { goalId, inviteCode } = await createSharedGoal(d.client, input);
  return { goalId, inviteUrl: inviteUrl(inviteCode), onDevice: await tryRefetch(d, goalId) };
}

/** 초대로 들어간다(이미 멤버면 그대로). onDevice가 false면 기기에는 다음 회차가 내 멤버 행을 보고 받아 온다. */
export async function joinAndFetch(
  d: ActionDeps, code: string, displayName: string, stickerId: string,
): Promise<{ goalId: string; onDevice: boolean }> {
  const { goalId } = await joinGoal(d.client, code, displayName, stickerId);
  return { goalId, onDevice: await tryRefetch(d, goalId) };
}

/** 이미 든 목표를 서버 것으로 다시 받는다(초대 링크를 다시 열었을 때). false면 다음 동기화 회차에 맡긴다. */
export async function fetchJoined(d: ActionDeps, goalId: string): Promise<boolean> {
  return tryRefetch(d, goalId);
}

/** 내 이름과 스티커를 바꾼다. */
export async function saveMine(d: ActionDeps, goalId: string, displayName: string, stickerId: string): Promise<void> {
  await onGoal(d, goalId, () => updateMember(d.client, goalId, displayName, stickerId));
  await tryRefetch(d, goalId);
}

/** 목표 이름과 칸 수, 종료일을 바꾼다(만든 사람만). 종료일은 만들 때만 정하므로 화면은 지금 값을 그대로 넘긴다. */
export async function saveGoal(
  d: ActionDeps, goalId: string, v: Parameters<typeof updateSharedGoal>[2],
): Promise<void> {
  await onGoal(d, goalId, () => updateSharedGoal(d.client, goalId, v));
  await tryRefetch(d, goalId);
}

/**
 * 나간다. 안 올린 내 칸이 새 혼자 목표로 옮겨지도록 먼저 올린다 — 올리기가 실패하면 나가지 않는다.
 * 나간 목표는 기기에서 지워지고(서버가 NotMember), 각자 판이면 옮겨 간 새 혼자 목표를 받는다.
 */
export async function leave(d: ActionDeps, goalId: string): Promise<{ soloGoalId: string | null }> {
  try {
    await pushOnce(d.sync);
  } catch (error) {
    // 올리기가 막힌 이유는 연결이다. 화면이 낱말로 가르도록 SharedGoalError로 바꾼다.
    // 계정이 바뀐 AccountChanged는 그대로 던진다 — 화면이 이미 다른 계정 것이라 문구 없이 닫는다.
    throw error instanceof AccountChanged ? error : new SharedGoalError('network');
  }
  const { soloGoalId } = await onGoal(d, goalId, () => leaveSharedGoal(d.client, goalId));
  purgeServerPhotos(d);
  await tryRefetch(d, goalId);
  if (soloGoalId) await tryRefetch(d, soloGoalId);
  return { soloGoalId };
}

/** 나가고, 옮겨 온 새 혼자 목표(내 판)까지 지운다. 지운 기록의 기기 사진 경로를 돌려준다. */
export async function removeAsOwner(d: ActionDeps, goalId: string): Promise<string[]> {
  const { soloGoalId } = await leave(d, goalId);
  return soloGoalId ? deleteGoal(soloGoalId) : [];
}

/**
 * 내보낸다(만든 사람만). 그 사람이 이미 나갔으면(not_member인데 다시 받은 뒤에도 목표가 기기에 있다) 바란 결과라 끝난 것으로 본다.
 * 목표가 기기에서 사라졌으면 내가 나온 것이라 그대로 던진다. 다시 받지 못했으면 어느 쪽인지 몰라 연결 실패(network)로 던진다.
 */
export async function kick(d: ActionDeps, goalId: string, userId: string): Promise<void> {
  let refetched = true;
  try {
    await onGoal(d, goalId, () => kickMember(d.client, goalId, userId), (ok) => { refetched = ok; });
  } catch (error) {
    if (error instanceof SharedGoalError && error.word === 'not_member' && (await getGoal(goalId))) {
      if (!refetched) throw new SharedGoalError('network');
      return;
    }
    throw error;
  }
  purgeServerPhotos(d);
  await tryRefetch(d, goalId);
}

/** 차단한다. 서버가 차단 관계인 사람과 그 판을 빼고 주므로, 그 사람이 있는 목표마다 다시 받는다. */
export async function block(d: ActionDeps, userId: string): Promise<void> {
  await blockUser(d.client, userId);
  purgeServerPhotos(d);
  for (const goalId of await listGoalsWith(userId)) await tryRefetch(d, goalId);
}

/** 차단을 푼다. 서버가 목표 행 순번을 바꿔 다음 회차가 다시 받는다. */
export async function unblock(d: ActionDeps, userId: string): Promise<void> {
  await unblockUser(d.client, userId);
  requestSync();
}

/** 내가 차단한 사람(최근 차단 먼저). 이름은 차단할 때 남긴 이름이라 없을 수 있다. */
export async function blockedPeople(d: ActionDeps): Promise<{ userId: string; displayName: string | null }[]> {
  return myBlocks(d.client);
}

/** 불쾌한 이름 신고. 대상이 null이면 목표 이름이다. 신고는 기기에 남기지 않는다. */
export async function reportName(d: ActionDeps, goalId: string, targetUserId: string | null): Promise<void> {
  await onGoal(d, goalId, () => reportGoal(d.client, goalId, targetUserId, 'name'));
  // 운영자에게 알림 메일. 기다리지 않고, 실패하면 알리지 않은 신고로 남아 다음 신고 때 함께 간다(20261106000005)
  d.notifyReports?.().catch(() => {});
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
  await shareLink(goalName, await onGoal(d, goalId, () => rotateInvite(d.client, goalId)));
}

const shareLink = (goalName: string, code: string) => shareInviteUrl(goalName, inviteUrl(code));

/** 초대 주소를 OS 공유 창으로 보낸다. 공유를 닫거나 취소해도 그대로 끝난다. */
export async function shareInviteUrl(goalName: string, url: string): Promise<void> {
  // 메시지 안의 주소를 메신저가 링크로 읽으므로 iOS에도 url을 따로 주지 않는다
  await Share.share({ message: t('together.shareMessage', goalName, url) });
}
