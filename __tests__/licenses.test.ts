import { LICENSES } from '../src/policy/licenses';

describe('오픈소스 라이선스 목록 (PRD 4.9)', () => {
  it('모든 항목이 라이선스 원문을 갖는다', () => {
    const empty = LICENSES.filter((l) => !l.text?.trim()).map((l) => l.name);
    expect(empty).toEqual([]);
  });

  it('주소에 그대로 쓸 수 있는 겹치지 않는 id를 갖는다', () => {
    const ids = LICENSES.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-zA-Z0-9._-]+$/);
  });

  it('앱에 들어가는 주요 라이브러리와 네이티브 라이브러리를 싣는다', () => {
    const names = LICENSES.map((l) => l.name);
    expect(names[0]).toBe('Neo둥근모');
    for (const name of ['react-native', 'expo', 'react', '@supabase/supabase-js', 'expo-router', 'react-native-reanimated', 'Hermes', 'Folly']) {
      expect(names).toContain(name);
    }
  });
});
