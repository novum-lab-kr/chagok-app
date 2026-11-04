import type { FriendBoardItem, MemberBadge, StickerId } from '../design-system';
import { stickerDate } from '../domain/board';
import { localDateKey } from '../domain/dates';
import type { DateKey } from '../domain/dates';
import { DEFAULT_STICKER_ID } from '../domain/types';
import type { Goal, GoalMember, Sticker } from '../domain/types';
import { ME } from '../repositories/ids';
import { normalizeStickerId } from '../stickers/stickerIds';
import { longDate } from './pocketAdapter';

/**
 * 함께 목표 판 화면에 넘길 값 (PRD 4.15). 기기 DB 행에서 만든다. 라우트는 계산하지 않고 이 값만 넘긴다.
 * 차단으로 가려진 칸은 스티커 종류가 빈 문자열이다(stickerRepository toSticker). 이름과 스티커 없이 흐리게 그린다.
 */
const isHidden = (s: Sticker) => s.stickerType === '';
const nameOf = (m: GoalMember | undefined) => m?.displayName ?? '';
const stickerOf = (m: GoalMember, fallback: string): StickerId => normalizeStickerId(m.stickerId ?? fallback);
const memberOf = (members: readonly GoalMember[], userId: string | null) => members.find((m) => m.userId === userId);

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

/** 한 판 위 사람 줄. 나는 「나」 배지. */
export function memberBadgesOf(members: readonly GoalMember[]): MemberBadge[] {
  return members.map((m) => ({ id: m.userId, name: nameOf(m), sticker: stickerOf(m, DEFAULT_STICKER_ID), ...(m.isMe ? { me: true } : {}) }));
}

export type PlacedBy = { name: string; at: number };

/**
 * 한 판 적립판의 칸. filled는 칸 번호(1부터) → 붙인 사람의 스티커, hidden은 가려진 칸 번호.
 * placedBy는 친구가 붙인 칸만 담는다(내 칸은 기록을 열고, 가려진 칸은 누를 수 없다).
 */
export function oneBoardCells(stickers: readonly Sticker[], members: readonly GoalMember[]): {
  filled: Record<number, StickerId>; hidden: Set<number>; placedBy: Record<number, PlacedBy>;
} {
  const filled: Record<number, StickerId> = {};
  const hidden = new Set<number>();
  const placedBy: Record<number, PlacedBy> = {};
  for (const s of stickers) {
    const n = s.slotIndex + 1;
    if (isHidden(s)) { hidden.add(n); continue; }
    filled[n] = normalizeStickerId(s.stickerType);
    if (s.placedBy !== ME) placedBy[n] = { name: nameOf(memberOf(members, s.placedBy)), at: s.placedAt };
  }
  return { filled, hidden, placedBy };
}

/**
 * 한 판 달력판: 날마다 판에 보이는 한 장(그날 먼저 붙인 것, 가려진 칸은 빼고).
 * 같은 날 두 장을 겹쳐 그리는 모양은 아직 없다(계획 「아침에 물을 것」 1).
 */
export function oneBoardShown(stickers: readonly Sticker[]): Record<DateKey, Sticker> {
  const shown: Record<DateKey, Sticker> = {};
  for (const s of [...stickers].sort((a, b) => a.placedAt - b.placedAt)) {
    if (!isHidden(s)) shown[stickerDate(s)] ??= s;
  }
  return shown;
}

/**
 * 한 판 달력판의 하루: 그날 붙인 사람(먼저 붙인 순서, 가려진 칸 빼고)과 내가 더 붙일 수 있는지.
 * 하루에 두 장까지, 한 사람은 한 장이다(stickerRepository placeSticker, 서버 트리거와 같은 규칙). 가려진 칸도 두 장에 든다.
 */
export function oneBoardDay(stickers: readonly Sticker[], members: readonly GoalMember[], date: DateKey): {
  people: { name: string; at: number; me: boolean }[]; canPlaceToo: boolean;
} {
  const day = stickers.filter((s) => stickerDate(s) === date).sort((a, b) => a.placedAt - b.placedAt);
  const people = day.filter((s) => !isHidden(s)).map((s) => ({
    name: nameOf(memberOf(members, s.placedBy)), at: s.placedAt, me: s.placedBy === ME,
  }));
  return { people, canPlaceToo: day.length < 2 && !day.some((s) => s.placedBy === ME) };
}

/** 「9월 3일 15:05」. 누가 언제 붙였는지 창에 쓴다. */
export function placedWhen(at: number): string {
  const d = new Date(at);
  return `${longDate(localDateKey(at))} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
}
