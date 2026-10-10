import { colorStickers } from '../src/stickers/color/catalog';
import fs from 'fs';
import path from 'path';

const artDir = path.join(__dirname, '..', 'assets', 'widget-art');

describe('widgetArt', () => {
  it('첫 복사가 실패해도 다음 호출에서 다시 시도해 성공한다', async () => {
    jest.resetModules();
    for (const f of fs.readdirSync(artDir).filter((n) => n.endsWith('.png'))) {
      jest.doMock(path.join(artDir, f), () => 1, { virtual: true });
    }
    let downloads = 0;
    jest.doMock('expo-asset', () => ({
      Asset: {
        fromModule: () => ({
          localUri: 'file:///src.png',
          downloadAsync: async () => { downloads += 1; if (downloads === 1) throw new Error('일시 오류'); },
        }),
      },
    }));
    jest.doMock('expo-file-system', () => ({
      File: class { uri: string; exists = false; constructor(u: string) { this.uri = u; } async copy() {} },
    }));
    jest.doMock('expo-widgets', () => ({ widgetsDirectory: 'file:///widgets' }));
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { widgetArt } = require('../src/widgets/widgetArt.ios') as typeof import('../src/widgets/widgetArt.ios');
    await expect(widgetArt()).rejects.toThrow('일시 오류');
    const art = await widgetArt();
    expect(art.mascotYet).toBe('file:///widgets/mascot-basic.png');
    expect(art.mascotDone).toBe('file:///widgets/mascot-smile.png');
    expect(art.mascotFull).toBe('file:///widgets/mascot-excited.png');
    expect(Object.keys(art.stickers)).toEqual(colorStickers.map((s) => s.id)); // 컬러 스티커 전부 (2026-10-08)
  });
});
