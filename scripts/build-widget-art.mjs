// 위젯 그림을 PNG로 굽는다(PRD 4.10). zlib만 쓴다.
// node scripts/build-widget-art.mjs → assets/widget-art/
//   color-<묶음>-<이름>.png  컬러 스티커 전부(24칸 × 6 = 144px, 48pt @3x)
//   mascot-<face>.png     차곡이 얼굴(24칸 × 6)
//   bubble-<scheme>-<palette>.png  말풍선 틀(글자 없음, 32×14칸 × 6)
import fs from 'node:fs';
import zlib from 'node:zlib';
import { Buffer } from 'node:buffer';

const S = 6;
const out = 'assets/widget-art';
fs.mkdirSync(out, { recursive: true });

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const c = Buffer.alloc(4); c.writeUInt32BE(crc(td));
  return Buffer.concat([len, td, c]);
};
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

/** cells: (w,h, get(x,y) → '#RRGGBB' | null) → PNG */
function png(name, w, h, get) {
  const W = w * S, H = h * S, px = Buffer.alloc(H * (1 + W * 4));
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const c = get(x, y); if (!c) continue;
    const [r, g, b] = hex(c);
    for (let yy = y * S; yy < (y + 1) * S; yy++) for (let xx = x * S; xx < (x + 1) * S; xx++) {
      const o = yy * (1 + W * 4) + 1 + xx * 4; px[o] = r; px[o + 1] = g; px[o + 2] = b; px[o + 3] = 255;
    }
  }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 6;
  fs.writeFileSync(`${out}/${name}.png`, Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(px)), chunk('IEND', Buffer.alloc(0)),
  ]));
  console.log(name, W, H);
}

// 컬러 스티커 전부 (2026-10-08 — 목표의 기본 스티커는 어느 묶음이든 될 수 있다).
// 앱 ID(묶음.이름)는 scripts/build-color-stickers.mjs와 같은 규칙으로 붙인다. 파일은 color-<묶음>-<이름>.png.
// Metro는 require 경로가 고정이어야 해서 src/widgets/widgetStickerArt.generated.ts에 목록을 함께 쓴다.
const PACK_IDS = { free: 'basic' };
const STICKER_IDS = { 'weather.sun2': 'sun' };
const src = JSON.parse(fs.readFileSync('src/stickers/color/source/sticker-packs-24.json', 'utf8'));
const stickerArt = [];
for (const s of src.stickers) {
  const pack = PACK_IDS[s.theme] ?? s.theme;
  const name = STICKER_IDS[`${s.theme}.${s.id}`] ?? s.id;
  const grid = new Map();
  for (const l of s.layers) for (const [, x, y, w] of l.d.matchAll(/M(\d+) (\d+)h(\d+)v1h-\d+Z/g))
    for (let i = 0; i < Number(w); i++) grid.set(`${Number(x) + i},${y}`, l.color);
  png(`color-${pack}-${name}`, 24, 24, (x, y) => grid.get(`${x},${y}`) ?? null);
  stickerArt.push(`  '${pack}.${name}': require('../../assets/widget-art/color-${pack}-${name}.png'),`);
}
fs.writeFileSync('src/widgets/widgetStickerArt.generated.ts', `// 생성 파일 — 직접 고치지 않는다. node scripts/build-widget-art.mjs로 다시 만든다.
// 위젯 스티커 그림: 컬러 스티커 ID → 앱 번들 PNG.
export const widgetStickerArt: Record<string, number> = {
${stickerArt.join('\n')}
};
`);

// 차곡이
const PAL = { '#': '#06261C', g: '#C7DE94', o: '#FD855F', w: '#FEF1D1', m: '#AFE1CB' };
const faces = JSON.parse(fs.readFileSync('docs/design/character/character-data.json', 'utf8')).faces;
for (const f of ['basic', 'smile', 'excited', 'sleepy']) png(`mascot-${f}`, 24, 24, (x, y) => PAL[faces[f][y][x]] ?? null);

// 말풍선 틀: 몸통 32×11칸(둥근 픽셀 모서리) + 왼쪽 아래 꼬리 3칸
const BUBBLE = {
  ivory: { fill: '#FFF8E8', ink: '#06261C' },
  white: { fill: '#F4F4F2', ink: '#1C2321' },
  ink: { fill: '#26262A', ink: '#FEF1D1' },
};
for (const [name, { fill, ink }] of Object.entries(BUBBLE)) {
  png(`bubble-${name}`, 32, 14, (x, y) => {
    if (y <= 10) {
      const corner = (y === 0 || y === 10) ? (x < 2 || x > 29) : (y === 1 || y === 9) ? (x < 1 || x > 30) : false;
      if (corner) return null;
      if (y === 10 && (x === 4 || x === 5)) return fill; // 꼬리로 열린 곳
      const edge = y === 0 || y === 10 || x === 0 || x === 31 || ((y === 1 || y === 9) && (x === 1 || x === 30));
      return edge ? ink : fill;
    }
    // 꼬리: 왼쪽 아래 차곡이 쪽으로
    if (y === 11) return x === 3 || x === 6 ? ink : x === 4 || x === 5 ? fill : null;
    if (y === 12) return x === 2 || x === 5 ? ink : x === 3 || x === 4 ? fill : null;
    if (y === 13) return x >= 1 && x <= 4 ? ink : null;
    return null;
  });
}
