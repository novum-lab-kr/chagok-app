import { pocketStickers } from '../stickers/pocket/catalog';
import type { PocketStickerId } from '../stickers/pocket/catalog';
import type { PocketGoal } from '../design-system/screen-compositions';
import { DEFAULT_STICKER_ID } from '../domain/types';
import type { Goal, Sticker } from '../domain/types';

const KNOWN = new Set<string>(pocketStickers.map((s) => s.id));

/**
 * DB에는 폐기된 카탈로그의 id가 남아 있을 수 있다. 화면이 터지지 않도록
 * 알 수 없는 값은 기본 스티커로 대체한다. 저장값은 바꾸지 않는다.
 */
export function safeStickerId(raw: string): PocketStickerId {
  return (KNOWN.has(raw) ? raw : DEFAULT_STICKER_ID) as PocketStickerId;
}

/**
 * 달력 칸의 키. **로컬 시간 기준**이어야 한다.
 * toISOString()은 UTC로 바꾸므로 자정 근처에서 하루가 밀린다.
 */
export function localDateKey(epochMs: number): string {
  const d = new Date(epochMs);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/**
 * 도메인 모델을 디자인 시스템의 화면 모델로 옮긴다.
 *
 * 디자인 시스템은 칸 번호가 1부터이고 도메인 `slotIndex`는 0부터다.
 * 이 함수가 그 경계를 흡수한다.
 */
export function toPocketGoal(goal: Goal, stickers: readonly Sticker[]): PocketGoal {
  const mine = stickers.filter((s) => s.goalId === goal.id);

  const filled = goal.boardType === 'tally'
    ? mine.map((s) => s.slotIndex + 1).sort((a, b) => a - b)
    : [];

  const calendarRecords: Record<string, PocketStickerId> = {};
  if (goal.boardType === 'calendar') {
    for (const s of mine) {
      calendarRecords[localDateKey(s.placedAt)] = safeStickerId(s.stickerType);
    }
  }

  return {
    id: goal.id,
    name: goal.name,
    kind: goal.boardType,
    total: goal.totalSlots ?? 0,
    sticker: safeStickerId(goal.defaultStickerId),
    filled,
    calendarRecords,
  };
}
