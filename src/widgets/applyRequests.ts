import { getGoal } from '../repositories/goalRepository';
import { listRecordedStickerIds } from '../repositories/recordRepository';
import { getSetting, setSetting } from '../repositories/appSettingsRepository';
import { listStickers, placeSticker, removeSticker } from '../repositories/stickerRepository';
import { normalizeStickerId } from '../stickers/stickerIds';
import { checkPlaceGate } from '../app-data/placeGate';
import { planRequest } from './requests';
import type { WidgetRequest } from './requests';

const HANDLED_LIMIT = 200;
/** 같은 요청이 이만큼 실패하면 처리한 것으로 넘긴다 — 영영 실패하는 요청 하나가 뒤 요청을 모두 막지 않게. */
const MAX_FAILURES = 3;
/** 요청 id별 실패 횟수. 앱을 다시 켜면 처음부터 센다. */
const failures = new Map<string, number>();

async function readHandledIds(): Promise<string[]> {
  try {
    const parsed: unknown = JSON.parse((await getSetting('widgetHandledRequests')) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

/**
 * 위젯 요청을 누른 시각 순서대로 기록에 반영한다 (위젯 설계 ③).
 * 저장에 실패하면 거기서 멈춘다 — 그 요청과 뒤 요청은 handled에 넣지 않아 다음에 다시 시도한다.
 * 스티커 id가 요청 id라 처리 도중 앱이 꺼져 다시 처리해도 두 번 붙지 않는다.
 * 처리한 요청 id는 최근 200개를 설정에 남겨 같은 요청을 두 번 처리하지 않는다 —
 * 되돌리기는 다시 처리하면 같은 날의 다른 스티커를 뗄 수 있기 때문이다.
 * 되돌리기는 id를 먼저 남긴 뒤 떼고(앱이 꺼지면 되돌리기만 사라지고 기록은 남는다), 나머지는 처리한 뒤에 남긴다.
 * 같은 요청이 앱을 켠 동안 세 번 실패하면 그 탭은 버리고(처리한 것으로 남기고) 뒤 요청으로 넘어간다.
 */
export function applyWidgetRequests(requests: readonly WidgetRequest[]): Promise<{ handled: string[]; changed: boolean }> {
  // 위젯 동기화와 워치 동기화가 따로 불러도 한 번에 하나씩 — 처리한 id 목록을 서로 덮어쓰지 않게 (PRD 4.14).
  const run = queue.then(() => applyInOrder(requests));
  queue = run.then(() => undefined, () => undefined);
  return run;
}

let queue: Promise<void> = Promise.resolve();

async function applyInOrder(requests: readonly WidgetRequest[]): Promise<{ handled: string[]; changed: boolean }> {
  const handled: string[] = [];
  let changed = false;
  const done = await readHandledIds();
  const remember = async (id: string) => {
    done.push(id);
    if (done.length > HANDLED_LIMIT) done.splice(0, done.length - HANDLED_LIMIT);
    await setSetting('widgetHandledRequests', JSON.stringify(done));
  };
  const ordered = [...requests].sort((a, b) => a.at - b.at || a.id.localeCompare(b.id));
  for (const req of ordered) {
    try {
      if (done.includes(req.id)) {
        handled.push(req.id);
        continue;
      }
      const goal = await getGoal(req.goalId);
      const stickers = goal ? await listStickers(goal.id) : [];
      const recorded = goal ? await listRecordedStickerIds(goal.id) : new Set<string>();
      const plan = planRequest(goal, stickers, recorded, req);
      if (plan.action === 'remove') {
        await remember(req.id);
        await removeSticker(plan.stickerId);
        changed = true;
      } else {
        // 기본 스티커 묶음의 체험이 끝났으면 붙이지 않는다. 위젯은 이미 앱 열기 링크로 바뀌어 있다 (2026-10-08).
        if (plan.action === 'place' && goal && (await checkPlaceGate(goal, req.at)).ok) {
          await placeSticker(goal.id, plan.slotIndex, normalizeStickerId(goal.defaultStickerId), { id: req.id, placedAt: plan.placedAt, pressedAt: req.at, complete: plan.complete });
          changed = true;
        }
        await remember(req.id);
      }
      handled.push(req.id);
    } catch (e) {
      const count = (failures.get(req.id) ?? 0) + 1;
      failures.set(req.id, count);
      if (count < MAX_FAILURES) break; // 잠깐의 실패일 수 있다 — 다음 계기에 이 요청부터 다시 한다
      failures.delete(req.id);
      if (typeof __DEV__ !== 'undefined' && __DEV__) console.warn(`widget request ${req.id} failed ${count} times — skipped`, e);
      try { await remember(req.id); } catch { /* 위젯에서는 지워지므로 다시 오지 않는다 */ }
      handled.push(req.id);
    }
  }
  return { handled, changed };
}
