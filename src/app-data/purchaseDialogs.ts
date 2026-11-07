import { stickerShopDialogs } from '../design-system';
import { restorePurchases, type BuyResult } from '../purchases';
import type { DialogChoice, DialogSpec } from './useDialog';

type Ask = (spec: DialogSpec) => Promise<DialogChoice>;

/**
 * 결제가 끝나지 않았을 때의 안내 (PRD 4.12). 결제 창을 닫은 취소에는 아무것도 띄우지 않고,
 * 보호자 승인을 기다리면 그 안내, 나머지는 화면이 넘긴 실패 안내를 띄운다.
 */
export async function notifyBuyFailure(ask: Ask, result: Extract<BuyResult, { ok: false }>, failed: DialogSpec): Promise<void> {
  if (result.reason === 'cancelled') return;
  await ask(result.reason === 'pending' ? stickerShopDialogs.purchasePending : failed);
}

/**
 * 구매 복원과 결과 안내. 복원이 끝나면(성공이든 실패든) settled를 부른다 — 화면이 로딩 점을 끈다.
 * 실패면 실패 안내를 띄우고 null, 성공이면 beforeNotice(화면 상태 다시 읽기)를 부른 뒤 결과 안내를 띄우고 되살린 이름을 돌려준다.
 */
export async function restoreWithDialog(ask: Ask, settled: () => void, beforeNotice?: () => Promise<void>): Promise<string[] | null> {
  let names: string[];
  try {
    names = await restorePurchases();
  } catch {
    await ask(stickerShopDialogs.restoreFailed);
    return null;
  } finally {
    settled();
  }
  await beforeNotice?.();
  await ask(names.length > 0 ? stickerShopDialogs.restoreDone(names) : stickerShopDialogs.restoreNone);
  return names;
}
