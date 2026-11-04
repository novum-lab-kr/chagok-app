/**
 * 함께 목표 판 모양 (PRD 4.15, 2026-11-04 시안 배치 A). 화면 없는 순수 함수라 jest(__tests__/boardShape.test.ts)로 본다.
 * 폭은 판 안쪽 폭(테두리와 여백을 뺀 칸 영역)이다. 날짜는 로컬 날짜 키 'YYYY-MM-DD'.
 */
const pad = (n: number) => String(n).padStart(2, '0');
const keyOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/**
 * 내 판 열 수: 4칸, 판 안 폭이 330 이상인 큰 폰은 5칸.
 * 함께 목표 판에 먼저 쓴다. 혼자 판도 같은 셈으로 바꾸기로 했다(2026-11-04 사용자, 아직 바꾸지 않음).
 */
export function boardColumns(innerWidth: number): number {
  return innerWidth >= 330 ? 5 : 4;
}
/** 칸 한 변. 남는 폭을 열 수로 나누고 72를 넘지 않는다. */
export function boardCellSize(innerWidth: number, columns: number, gap = 6, max = 72): number {
  return Math.max(0, Math.min(max, Math.floor((innerWidth - gap * (columns - 1)) / columns)));
}

/** 친구 적립판 줄의 열 수: 7칸, 얇은 판 안 폭이 320 이상이면 8칸. */
export function friendStripColumns(innerWidth: number): number {
  return innerWidth >= 320 ? 8 : 7;
}
/**
 * 친구 적립판 줄이 처음 보여 줄 첫 칸 번호(1부터). 가장 최근 칸(lastFilled)이 마지막 줄에 오도록 줄 단위로 맞춘다.
 * 아직 붙인 칸이 없으면 1.
 */
export function friendStripFirst(lastFilled: number, columns: number, rows = 2): number {
  return Math.max(1, (Math.ceil(lastFilled / columns) - rows) * columns + 1);
}

/** 적립판 쪽의 첫 칸. anchor(보통 다음 빈칸)가 든 쪽을 연다. */
export function pageFirst(anchor: number, perPage: number): number {
  return Math.floor((Math.max(1, anchor) - 1) / perPage) * perPage + 1;
}

/**
 * 몇 주를 보여 주는 달력 줄의 날짜들. 일요일에 시작하고, 마지막 주가 anchor가 든 주다(지난주, 이번 주).
 * offset만큼 그 묶음 단위로 앞뒤로 옮긴다(-1이면 그 앞 두 주).
 */
export function weekWindow(anchor: string, weeks = 2, offset = 0): string[] {
  const [y, m, d] = anchor.split('-').map(Number);
  const day = new Date(y, m - 1, d);
  const start = new Date(day.getFullYear(), day.getMonth(), day.getDate() - day.getDay() - 7 * (weeks - 1) + 7 * weeks * offset);
  return Array.from({ length: weeks * 7 }, (_, i) => keyOf(new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)));
}
