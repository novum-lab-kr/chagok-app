import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { stickerBlockColors } from '../src/watch/stickerColors.generated';

// 워치 그림 (워치 계획 2 Task 2). 워치 타깃은 prebuild 때 assets/widget-art의 컬러 스티커를 싣는다.
describe('워치 그림', () => {
  it('차곡이 픽셀 데이터가 원본과 같다(생성 파일이 최신이다)', () => {
    const file = 'targets/watch/UI/CharacterArt.generated.swift';
    const before = fs.readFileSync(file, 'utf8');
    execFileSync('node', ['scripts/build-watch-art.mjs']);
    expect(fs.readFileSync(file, 'utf8')).toBe(before);
  });

  it('블록 색이 있는 스티커는 모두 워치 그림이 있다', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const config = require('../targets/watch/expo-target.config.js')() as { images: Record<string, string> };
    const names = Object.keys(stickerBlockColors).map((id) => id.replace('.', '-')).sort();
    expect(Object.keys(config.images).sort()).toEqual(names);
    for (const p of Object.values(config.images)) expect(fs.existsSync(`targets/watch/${p}`)).toBe(true);
  });
});
