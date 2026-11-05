import {photoFrameRatio} from '../src/design-system/geometry';

describe('photoFrameRatio', () => {
  it('세로 3:4(아이폰 세로 사진)는 그대로', () => expect(photoFrameRatio(3000, 4000)).toBeCloseTo(3 / 4));
  it('세로 4:5는 그대로', () => expect(photoFrameRatio(4000, 5000)).toBeCloseTo(4 / 5));
  it('세로 9:16은 3:4로 막는다', () => expect(photoFrameRatio(1080, 1920)).toBeCloseTo(3 / 4));
  it('가로 4:3은 그대로', () => expect(photoFrameRatio(4032, 3024)).toBeCloseTo(4 / 3));
  it('가로 21:9는 16:9로 막는다', () => expect(photoFrameRatio(2100, 900)).toBeCloseTo(16 / 9));
  it('정사각은 1', () => expect(photoFrameRatio(500, 500)).toBe(1));
  it('크기를 모르면 null', () => {
    expect(photoFrameRatio(0, 100)).toBeNull();
    expect(photoFrameRatio(100, NaN)).toBeNull();
  });
});
