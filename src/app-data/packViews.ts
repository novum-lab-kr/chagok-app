import type { PackView } from '../design-system';
import { localDateKey } from '../domain/dates';
import { canUseSticker, packStatus, type PackAccess } from '../domain/packs';
import { colorStickerPacks, colorStickersInPack, getColorSticker, type ColorStickerId, type ColorStickerPackId } from '../stickers/color/catalog';
import { DEFAULT_COLOR_STICKER, normalizeStickerId } from '../stickers/stickerIds';

/** 「기본 스티커」·묶음 화면의 묶음 목록. colorStickerPacks 순서 (PRD 4.12). */
export function packViews(access: readonly PackAccess[], now: number): PackView[] {
  return colorStickerPacks.map((p) => {
    const s = packStatus(p.id, access, now);
    return {
      id: p.id,
      label: p.label,
      state: s.state,
      stickers: colorStickersInPack(p.id).map((c) => c.id as ColorStickerId),
      ...(s.trialLabel ? { trialLabel: s.trialLabel } : {}),
    };
  });
}

/** 묶음 화면 「판에 붙이면」: 서로 다른 스티커 5개. */
export const samplePlacement = (pack: PackView) => pack.stickers.slice(0, 5);

/**
 * 광고 하루 체험이 끝나는 때. 시안 「내일 밤 11:00」(2026-10-08) 하나뿐이라 때는
 * 새벽 0~6시 · 아침 6~12시 · 낮 12~18시 · 밤 18~24시로 나눈다. 시각은 12시간제.
 */
export function endLabel(endsAt: number, now: number): string {
  const d = new Date(endsAt);
  const day = localDateKey(endsAt) === localDateKey(now) ? '오늘' : '내일';
  const h = d.getHours();
  const part = h < 6 ? '새벽' : h < 12 ? '아침' : h < 18 ? '낮' : '밤';
  return `${day} ${part} ${h % 12 === 0 ? 12 : h % 12}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/**
 * 「기본 스티커」를 열 때 고른 스티커와 펼칠 묶음. 지금 스티커가 잠긴 묶음이면(체험이 끝난 뒤 [다른 스티커])
 * 그대로 고르면 같은 안내가 반복되므로 새싹을 고른 채로 연다.
 */
export function initialChoice(current: string, access: readonly PackAccess[], now: number): { selected: ColorStickerId; open: ColorStickerPackId } {
  const id = normalizeStickerId(current);
  const selected = canUseSticker(id, access, now) ? id : DEFAULT_COLOR_STICKER;
  return { selected, open: getColorSticker(selected).pack };
}
