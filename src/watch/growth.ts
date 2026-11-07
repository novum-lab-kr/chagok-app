import { countAllStickers } from '../repositories/stickerRepository';

/**
 * 성장 수 = 지금 내가 붙인 스티커 전체 수 (워치 설계 「성장 수」, PRD 4.14). 완성한 판의 스티커도 센다. 친구가 붙인 칸은 세지 않는다.
 * 떼거나 판을 지우면 줄고, 다시 붙이면 다시 는다 (2026-10-17). 예전 판이 저장한 최고치(app_settings 'watchGrowth')는 쓰지 않는다.
 */
export async function updateGrowth(): Promise<number> {
  return countAllStickers();
}
