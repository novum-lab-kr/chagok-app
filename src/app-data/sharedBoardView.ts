import type { FriendBoardItem, MemberBadge, MemberRow, OneBoardMember, StickerId } from '../design-system';
import { canPlace, completesBoard, isDateEnabled, stickerDate } from '../domain/board';
import type { PlaceTarget } from '../domain/board';
import { localDateKey } from '../domain/dates';
import type { DateKey } from '../domain/dates';
import { DEFAULT_STICKER_ID } from '../domain/types';
import type { Goal, GoalMember, Sticker } from '../domain/types';
import { ME } from '../repositories/ids';
import { normalizeStickerId } from '../stickers/stickerIds';

/**
 * 함께 목표 판 화면에 넘길 값 (PRD 4.15). 기기 DB 행에서 만든다. 라우트는 계산하지 않고 이 값만 넘긴다.
 * 차단으로 가려진 칸은 스티커 종류가 빈 문자열이다(stickerRepository toSticker). 이름과 스티커 없이 흐리게 그린다.
 */
const isHidden = (s: Sticker) => s.stickerType === '';
const nameOf = (m: GoalMember | undefined) => m?.displayName ?? '';
const stickerOf = (m: GoalMember, fallback: string): StickerId => normalizeStickerId(m.stickerId ?? fallback);

/** 각자 판 아래 친구 판 줄. 나는 빼고 들어온 순서(members 순서) 그대로. */
export function friendBoardsOf(goal: Goal, members: readonly GoalMember[], friendStickers: Readonly<Record<string, readonly Sticker[]>>, today: DateKey): FriendBoardItem[] {
  return members.filter((m) => !m.isMe).map((m) => {
    const stickers = friendStickers[m.userId] ?? [];
    return {
      id: m.userId,
      name: nameOf(m),
      sticker: stickerOf(m, goal.defaultStickerId),
      board: goal.boardType === 'tally'
        ? { kind: 'tally', total: goal.totalSlots ?? 0, filled: new Set(stickers.map((s) => s.slotIndex + 1)) }
        : { kind: 'calendar', today, start: localDateKey(m.joinedAt ?? goal.createdAt), dates: new Set(stickers.map(stickerDate)) },
    };
  });
}

/** 목표 설정 「함께하는 사람」 줄. 들어온 순서 그대로, 나는 「(나)」, 만든 사람은 배지. */
export function memberRowsOf(goal: Goal, members: readonly GoalMember[]): MemberRow[] {
  return members.map((m) => ({
    id: m.userId, name: nameOf(m), sticker: stickerOf(m, goal.defaultStickerId),
    ...(m.isMe ? { me: true } : {}), ...(m.role === 'owner' ? { owner: true } : {}),
  }));
}

/** 한 판 위 사람 줄. 나는 「나」 배지. */
export function memberBadgesOf(members: readonly GoalMember[]): MemberBadge[] {
  return members.map((m) => ({ id: m.userId, name: nameOf(m), sticker: stickerOf(m, DEFAULT_STICKER_ID), ...(m.isMe ? { me: true } : {}) }));
}

/** 한 판 아래 「함께하는 사람」: 만든 사람 먼저, 그다음 들어온 순서(나도 그 자리). 사람마다 이 판에 붙인 칸 수(가려진 칸은 세지 않는다). */
export function oneBoardMembersOf(members: readonly GoalMember[], stickers: readonly Sticker[]): OneBoardMember[] {
  const ordered = [...members.filter((m) => m.role === 'owner'), ...members.filter((m) => m.role !== 'owner')];
  return memberBadgesOf(ordered).map((badge) => ({ ...badge, placed: stickers.filter((s) => s.placedBy === badge.id).length }));
}

/** 한 판 적립판의 칸. filled는 칸 번호(1부터) → 붙인 사람의 스티커, hidden은 가려진 칸 번호. */
export function oneBoardCells(stickers: readonly Sticker[]): { filled: Record<number, StickerId>; hidden: Set<number> } {
  const filled: Record<number, StickerId> = {};
  const hidden = new Set<number>();
  for (const s of stickers) {
    const n = s.slotIndex + 1;
    if (isHidden(s)) hidden.add(n);
    else filled[n] = normalizeStickerId(s.stickerType);
  }
  return { filled, hidden };
}

/**
 * 한 판 달력판: 날마다 판에 보이는 스티커(붙인 순서, 가려진 칸은 빼고). 하루 두 장까지라 둘째 장은 겹쳐 그린다 (2026-11-05 시안 T2 B안).
 */
export function oneBoardShown(stickers: readonly Sticker[]): Record<DateKey, Sticker[]> {
  const shown: Record<DateKey, Sticker[]> = {};
  for (const s of [...stickers].sort((a, b) => a.placedAt - b.placedAt)) {
    if (!isHidden(s)) (shown[stickerDate(s)] ??= []).push(s);
  }
  return shown;
}

const dayOf = (stickers: readonly Sticker[], date: DateKey) => stickers.filter((s) => stickerDate(s) === date).sort((a, b) => a.placedAt - b.placedAt);
/** 그날 내가 더 붙일 수 있는가: 하루 두 장까지(가려진 칸도 센다), 한 사람은 한 장(서버 트리거, stickerRepository placeSticker와 같은 규칙). */
const dayOpen = (day: readonly Sticker[]) => day.length < 2 && !day.some((s) => s.placedBy === ME);

/** 한 판 달력판에서 그날 내 스티커(둘째로 붙였어도). 꾹 누르면 이것을 뗀다. */
export function myStickerOn(stickers: readonly Sticker[], date: DateKey): Sticker | undefined {
  return dayOf(stickers, date).find((s) => s.placedBy === ME);
}

/**
 * 붙일 수 있는가. 한 판 달력판은 그날 다른 사람 스티커가 있어도(가려진 칸만 있어도) 두 장 미만이고 내 것이 없으면 붙인다.
 * 그 밖의 판은 canPlace 그대로.
 */
export function canPlaceOn(goal: Goal, stickers: readonly Sticker[], target: PlaceTarget, now: Date): boolean {
  if (goal.mode !== 'one' || goal.boardType !== 'calendar' || !('date' in target)) return canPlace(goal, stickers, target, now);
  const { date } = target;
  return date <= localDateKey(now.getTime()) && isDateEnabled(goal, date, false) && dayOpen(dayOf(stickers, date));
}

/**
 * 한 판 달력판의 붙은 날을 한 번 눌렀을 때. 붙인 사람을 보이는 창은 두지 않는다(2026-11-05 사용자, 나중에 메모와 사진이 들어갈 자리).
 * 내 스티커가 있으면 혼자 달력판처럼 기록을 열고, 친구 것만 있고 하루 두 장 규칙 안이면 붙이고(place), 아니면 아무 일도 없다(null).
 */
export function oneDayTap(goal: Goal, stickers: readonly Sticker[], date: DateKey, now: Date): { open: Sticker } | 'place' | null {
  const mine = myStickerOn(stickers, date);
  if (mine) return { open: mine };
  return canPlaceOn(goal, stickers, { date }, now) ? 'place' : null;
}

/** 이번에 붙이면 완성되는가. 한 판 달력판에서 이미 스티커가 있는 날에 붙이면 찬 날 수(filledCount)가 늘지 않아 완성하지 않는다. */
export function placeCompletes(goal: Goal, placedAll: number, stickers: readonly Sticker[], date?: DateKey): boolean {
  if (goal.mode === 'one' && date !== undefined && stickers.some((s) => stickerDate(s) === date)) return false;
  return completesBoard(goal, placedAll);
}
