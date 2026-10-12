import { describe, expect, it } from 'vitest';
import { minTouchTarget, touchSlop } from './touch';

describe('touchSlop', () => {
  it('최소 크기에 모자란 만큼 양쪽에 반씩 넓힌다', () => {
    expect(minTouchTarget).toBe(44);
    expect(touchSlop({ width: 36, height: 40 })).toEqual({ left: 4, right: 4, top: 2, bottom: 2 });
  });
  it('이미 크거나 크기를 모르는 쪽은 넓히지 않는다', () => {
    expect(touchSlop({ width: 60, height: 44 })).toEqual({ left: 0, right: 0, top: 0, bottom: 0 });
    expect(touchSlop({ height: 40 })).toEqual({ left: 0, right: 0, top: 2, bottom: 2 });
  });
});
