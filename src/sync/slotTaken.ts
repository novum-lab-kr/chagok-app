/**
 * 한 판에서 내가 붙인 칸을 다른 사람이 먼저 붙였다(slot_taken). 올리기(push.ts)가 기기에서 칸을 지운 뒤 알리고,
 * 그 판을 보고 있는 화면이 「이미 누가 붙였어요」를 한 번 보인다. 화면이 없으면 알림은 그냥 사라진다.
 */
const listeners = new Set<(goalId: string) => void>();

export function notifySlotTaken(goalId: string): void {
  for (const fn of [...listeners]) fn(goalId);
}

export function subscribeSlotTaken(fn: (goalId: string) => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}
