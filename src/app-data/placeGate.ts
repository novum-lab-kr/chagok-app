import { packStatus, type PackAccess, type TrialKind } from '../domain/packs';
import type { Goal } from '../domain/types';
import { getColorSticker, type ColorStickerPackId } from '../stickers/color/catalog';
import { normalizeStickerId } from '../stickers/stickerIds';
import { listPackAccess } from '../repositories/packRepository';

/**
 * 이 목표의 기본 스티커를 새로 붙일 수 있는가 (RELEASE-DECISIONS 2026-10-08 「체험이 끝난 뒤」).
 * 막히면 「n일 체험이 끝났어요」로 안내한다. 이미 붙은 칸은 그대로 보인다 — 여기서는 새로 붙이기만 막는다.
 * 체험 기록 없이 잠긴 묶음(앱을 지우고 다시 설치 등)은 3일 체험 문구로 안내한다.
 */
export function placeGate(goal: Goal, access: readonly PackAccess[], now: number): { ok: true } | { ok: false; kind: TrialKind; packId: ColorStickerPackId } {
  const packId = getColorSticker(normalizeStickerId(goal.defaultStickerId)).pack;
  const s = packStatus(packId, access, now);
  return s.state === 'locked' ? { ok: false, kind: s.endedKind ?? '3일', packId } : { ok: true };
}

/** 위젯용: 기본 스티커를 언제까지 새로 붙일 수 있는가. null = 기한 없음(기본·산 묶음), 0 = 이미 잠김. */
export function stickerUsableUntil(goal: Goal, access: readonly PackAccess[], now: number): number | null {
  const packId = getColorSticker(normalizeStickerId(goal.defaultStickerId)).pack;
  const s = packStatus(packId, access, now);
  if (s.state === 'locked') return 0;
  if (s.state !== 'trial') return null;
  return Math.max(...access.filter((a) => a.packId === packId && a.expiresAt !== null).map((a) => a.expiresAt!));
}

/** 이 기기의 묶음 권한으로 지금 판단한다. 판 화면이 붙이기 전에 부른다. */
export async function checkPlaceGate(goal: Goal, now = Date.now()) {
  return placeGate(goal, await listPackAccess(), now);
}
