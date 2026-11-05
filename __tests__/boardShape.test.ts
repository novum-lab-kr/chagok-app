import { boardCellSize, boardColumns, friendStripColumns, friendStripFirst, pageFirst, weekWindow } from '../src/design-system/board-shape';

describe('내 판 열 수 (함께 목표, 2026-11-04)', () => {
  test('4칸, 판 안 폭 330 이상이면 5칸', () => {
    expect(boardColumns(310)).toBe(4);
    expect(boardColumns(329)).toBe(4);
    expect(boardColumns(330)).toBe(5);
    expect(boardColumns(360)).toBe(5);
  });
  test('칸은 남는 폭을 나누고 72를 넘지 않는다', () => {
    expect(boardCellSize(290, 4)).toBe(68); // (290 - 18) / 4
    expect(boardCellSize(360, 5)).toBe(67); // (360 - 24) / 5
    expect(boardCellSize(400, 4)).toBe(72);
    expect(boardCellSize(0, 4)).toBe(0);
  });
  test('쪽은 기준 칸이 든 쪽에서 연다', () => {
    expect(pageFirst(12, 8)).toBe(9);
    expect(pageFirst(8, 8)).toBe(1);
    expect(pageFirst(1, 10)).toBe(1);
    expect(pageFirst(0, 10)).toBe(1);
  });
});

describe('친구 적립판 줄', () => {
  test('7칸, 판 안 폭 320 이상이면 8칸', () => {
    expect(friendStripColumns(300)).toBe(7);
    expect(friendStripColumns(319)).toBe(7);
    expect(friendStripColumns(320)).toBe(8);
  });
  test('가장 최근 칸이 둘째 줄에 오도록 연다', () => {
    expect(friendStripFirst(0, 7)).toBe(1);
    expect(friendStripFirst(9, 7)).toBe(1); // 1~14
    expect(friendStripFirst(14, 7)).toBe(1);
    expect(friendStripFirst(15, 7)).toBe(8); // 8~21, 15는 둘째 줄
    expect(friendStripFirst(18, 7)).toBe(8);
    expect(friendStripFirst(21, 7)).toBe(8);
    expect(friendStripFirst(30, 8)).toBe(17); // 17~32, 30은 둘째 줄
  });
});

describe('두 주 달력 줄', () => {
  test('지난주 일요일부터 이번 주 토요일까지', () => {
    const days = weekWindow('2026-11-12'); // 목요일
    expect(days).toHaveLength(14);
    expect(days[0]).toBe('2026-11-01');
    expect(days[13]).toBe('2026-11-14');
  });
  test('달을 넘는다', () => {
    const days = weekWindow('2026-11-03');
    expect(days[0]).toBe('2026-10-25');
    expect(days[13]).toBe('2026-11-07');
  });
  test('앞뒤로 두 주씩 옮긴다', () => {
    expect(weekWindow('2026-11-12', 2, -1)[0]).toBe('2026-10-18');
    expect(weekWindow('2026-11-12', 2, 1)[0]).toBe('2026-11-15');
  });
});
