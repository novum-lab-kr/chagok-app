import type { ColorStickerPackId } from '../stickers/color/catalog';

/** 스토어가 돌려준 가격. amount·currency는 그 사람 스토어 계정 국가 기준, text는 기기 언어 형식(예: 「₩2,200」). */
export type StorePrice = { amount: number; currency: string; text: string };
/** 가격을 물을 상품: 묶음마다 하나, 광고 제거 하나 */
export type ProductKey = ColorStickerPackId | 'adFree';
export type PriceLabels = Partial<Record<ProductKey, string>>;

/**
 * 화면에 쓸 가격 (2026-10-13 결정 B). 원화는 화면 디자인대로 「2,200원」,
 * 다른 통화는 스토어가 준 글자 그대로 — 결제 창 가격과 어긋나지 않게.
 */
export function priceLabel(p: StorePrice): string {
  if (p.currency !== 'KRW') return p.text;
  return `${String(Math.round(p.amount)).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}원`;
}
