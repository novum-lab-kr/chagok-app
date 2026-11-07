import { ME, newId } from '../src/repositories/ids';

describe('ids', () => {
  it('newId는 소문자 uuid v4 모양이다 (서버가 uuid만 받는다)', () => {
    expect(newId()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it('두 번 부르면 다르다', () => {
    expect(newId()).not.toBe(newId());
  });

  it('이 기기 사용자는 me다', () => {
    expect(ME).toBe('me');
  });
});
