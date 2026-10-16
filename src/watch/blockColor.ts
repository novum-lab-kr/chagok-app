import { normalizeStickerId } from '../stickers/stickerIds';
import { stickerBlockColors } from './stickerColors.generated';

/** 색을 모를 때 돌려 쓰는 기본 색. 차곡이 머리 위 판 세 장(민트, 아이보리, 살구)과 같다 (PRD 4.11, 디자인 토큰 primitive). */
export const FALLBACK_BLOCK_COLORS = ['#AFE1CB', '#FEF1D1', '#FD855F'] as const;

/** 그 스티커의 블록 색 (PRD 4.14). 예전 흑백 id는 컬러로 옮겨 찾는다. */
export function blockColorOf(stickerId: string): string {
  return stickerBlockColors[normalizeStickerId(stickerId)] ?? FALLBACK_BLOCK_COLORS[0];
}
