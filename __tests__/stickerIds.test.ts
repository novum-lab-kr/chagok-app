import { normalizeStickerId } from '../src/stickers/stickerIds';

describe('normalizeStickerId', () => {
  it('컬러 ID는 그대로', () => expect(normalizeStickerId('animals_normal.cat')).toBe('animals_normal.cat'));
  it('옛 흑백 ID는 기본 묶음의 같은 그림으로', () => {
    for (const id of ['sprout', 'cat', 'star', 'flower', 'book', 'shoe']) expect(normalizeStickerId(id)).toBe(`basic.${id}`);
  });
  it('모르는 값은 새싹으로 — 저장값은 바꾸지 않는다', () => {
    expect(normalizeStickerId('stamp')).toBe('basic.sprout');
    expect(normalizeStickerId('animals_normal.nope')).toBe('basic.sprout');
  });
});
