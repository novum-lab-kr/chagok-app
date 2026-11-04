import type { Goal } from '../domain/types';
import { subscribeSlotTaken } from '../sync/slotTaken';
import { isOnline } from './online';

/**
 * 함께 목표 판 화면이 붙이기 전과 동기화 뒤에 하는 확인 (PRD 4.15). 판 화면(app/goal/[id]/index.tsx)이 쓴다.
 * 화면 밖에 두어 시험할 수 있게 했다. 창은 화면이 띄운다(디자인 시스템을 가져오지 않아 jest에서 돈다).
 */

/**
 * 한 판은 여럿이 같은 칸을 다투므로 연결이 있을 때만 붙인다. 연결이 없으면 onOffline(화면은 「연결되면 붙일 수 있어요」,
 * togetherDialogs.offlineOne)을 기다린 뒤 false(호출한 쪽은 기기에 쓰지 않는다). 한 판이 아니면 연결을 보지 않고 true.
 */
export async function oneBoardOnline(goal: Goal, onOffline: () => Promise<unknown>, online: () => Promise<boolean> = isOnline): Promise<boolean> {
  if (goal.mode !== 'one' || (await online())) return true;
  await onOffline();
  return false;
}

/** 같은 회차에 지워진 칸 알림을 모으는 시간 */
export const SLOT_TAKEN_GATHER_MS = 1000;

/**
 * 이 목표에서 내 칸이 slot_taken으로 지워지면 onTaken을 부른다. 같은 회차에 여러 칸이 지워져도 모아서 한 번이다.
 * 다른 목표의 알림은 무시한다. 돌려준 함수로 그만 듣는다(모으던 것도 버린다).
 */
export function watchSlotTaken(goalId: string, onTaken: () => void): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const off = subscribeSlotTaken((taken) => {
    if (taken !== goalId || timer) return;
    timer = setTimeout(() => { timer = undefined; onTaken(); }, SLOT_TAKEN_GATHER_MS);
  });
  return () => { off(); clearTimeout(timer); };
}
