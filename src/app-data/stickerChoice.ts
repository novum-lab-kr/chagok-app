import type { ColorStickerId, ColorStickerPackId } from '../stickers/color/catalog';

/**
 * 「기본 스티커」 화면 → 부른 화면으로 넘기는 값 (PRD 4.12). 한 번 읽으면 비운다.
 * 고른 스티커는 새 목표·목표 설정·판 화면이, 펼칠 묶음은 묶음 화면에서 돌아온 「기본 스티커」가 읽는다.
 */
let sticker: ColorStickerId | null = null;
let openPack: ColorStickerPackId | null = null;

export function offerSticker(id: ColorStickerId): void { sticker = id; }
export function takeOfferedSticker(): ColorStickerId | null { const v = sticker; sticker = null; return v; }
export function offerOpenPack(id: ColorStickerPackId): void { openPack = id; }
export function takeOpenPack(): ColorStickerPackId | null { const v = openPack; openPack = null; return v; }
