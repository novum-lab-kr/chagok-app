/**
 * 스티커 묶음을 쓸 수 있는가 (PRD 4.12, RELEASE-DECISIONS 2026-10-05~08). UI 없는 순수 함수다.
 * 여는 길: 사기(영구) · 광고를 끝까지 본 때부터 24시간 · 붙인 날 누적 7·14·이후 30일마다 묶음 하나 3일.
 * 체험으로 붙인 스티커는 끝나도 판에 남는다 — 여기서는 「새로 붙일 수 있는가」만 정한다.
 */
import { colorStickerPacks, getColorSticker, type ColorStickerId, type ColorStickerPackId } from '../stickers/color/catalog';

export type PackAccess = { packId: ColorStickerPackId; source: 'purchase' | 'ad' | 'days'; grantedAt: number; expiresAt: number | null };
export type TrialKind = '3일' | '하루';
export type PackStatus = { state: 'free' | 'owned' | 'trial' | 'locked'; trialLabel?: string; trialKind?: TrialKind; endedKind?: TrialKind };

const HOUR = 60 * 60 * 1000;
export const AD_TRIAL_MS = 24 * HOUR;
export const DAY_TRIAL_MS = 3 * AD_TRIAL_MS;

const kindOf = (a: PackAccess): TrialKind => (a.source === 'ad' ? '하루' : '3일');
const isFree = (packId: ColorStickerPackId) => colorStickerPacks.some((p) => p.id === packId && p.free);

/** 남은 시간 배지: 24시간 넘게 남으면 「n일 남음」, 24시간 이하면 「n시간 남음」(둘 다 올림). */
export function trialLabel(expiresAt: number, now: number): string {
  const left = Math.max(0, expiresAt - now);
  return left > AD_TRIAL_MS ? `${Math.ceil(left / AD_TRIAL_MS)}일 남음` : `${Math.max(1, Math.ceil(left / HOUR))}시간 남음`;
}

/** 같은 묶음에 줄이 여럿이면 산 것 > 끝나지 않은 체험 중 가장 늦게 끝나는 것 > 가장 최근에 끝난 것. */
export function packStatus(packId: ColorStickerPackId, access: readonly PackAccess[], now: number): PackStatus {
  if (isFree(packId)) return { state: 'free' };
  const mine = access.filter((a) => a.packId === packId);
  if (mine.some((a) => a.expiresAt === null)) return { state: 'owned' };
  const latest = (rows: PackAccess[]) => rows.reduce<PackAccess | null>((best, a) => (!best || a.expiresAt! > best.expiresAt! ? a : best), null);
  const live = latest(mine.filter((a) => a.expiresAt! > now));
  if (live) return { state: 'trial', trialLabel: trialLabel(live.expiresAt!, now), trialKind: kindOf(live) };
  const ended = latest(mine);
  return ended ? { state: 'locked', endedKind: kindOf(ended) } : { state: 'locked' };
}

/** 새로 붙이거나 기본 스티커로 고를 수 있는가. */
export function canUseSticker(id: ColorStickerId, access: readonly PackAccess[], now: number): boolean {
  return packStatus(getColorSticker(id).pack, access, now).state !== 'locked';
}

/** claimed번째(0부터) 붙인 날 체험을 받는 문턱: 7, 14, 그 뒤 30일마다. */
export function dayTrialThreshold(claimed: number): number {
  return claimed === 0 ? 7 : 14 + 30 * (claimed - 1);
}

/** 넘긴 문턱 수 − 받은 수. 문턱을 여럿 넘긴 채 받지 않았으면 그만큼 받을 수 있다. */
export function dayTrialsAvailable(days: number, claimed: number): number {
  let reached = 0;
  while (days >= dayTrialThreshold(reached)) reached++;
  return Math.max(0, reached - claimed);
}

/** 붙인 날 수로 넘긴 가장 높은 문턱. 7일 전이면 0. */
export function reachedThreshold(days: number): number {
  let reached = 0;
  for (let i = 0; days >= dayTrialThreshold(i); i++) reached = dayTrialThreshold(i);
  return reached;
}

/**
 * 목표 탭 맨 위 「체험 열림 카드」(2026-10-12). 받을 체험이 있을 때 보이고,
 * ×로 닫으면(dismissedAt = 닫을 때 넘긴 문턱) 다음 문턱을 넘길 때까지 다시 보이지 않는다.
 */
export function showTrialReadyCard(days: number, claimed: number, dismissedAt: number): boolean {
  return dayTrialsAvailable(days, claimed) > 0 && reachedThreshold(days) > dismissedAt;
}

/** 붙인 날 3일 체험을 시작할 수 있는가. 끝난 체험 묶음은 다시 고를 수 있다 (2026-10-08 계획 B). */
export function canStartDayTrial(packId: ColorStickerPackId, access: readonly PackAccess[], days: number, claimed: number, now: number): boolean {
  return dayTrialsAvailable(days, claimed) > 0 && packStatus(packId, access, now).state === 'locked';
}
