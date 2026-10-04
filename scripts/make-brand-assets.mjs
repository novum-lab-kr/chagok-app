// 캐릭터 데이터(docs/design/character/character-data.json)로 앱 아이콘·스플래시 PNG를 만든다. 의존성 없이 node만 쓴다.
// 기준: docs/design/character/README.md 「앱 아이콘」「스플래시」. 실행: node scripts/make-brand-assets.mjs
import { Buffer } from 'node:buffer';
import { readFileSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const data = JSON.parse(readFileSync('docs/design/character/character-data.json', 'utf8'));
const tokens = JSON.parse(readFileSync('docs/design/retro-pocket-v1/system/tokens.json', 'utf8')).primitive.color;
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16), 255];
const C = { mint: hex(tokens.mint.$value), lcd: hex(tokens.lcd.$value), ink: hex(tokens.ink.$value), apricot: hex(tokens.apricot.$value), ivory: hex(tokens.ivory.$value) };
const CELL = { '#': C.ink, g: C.lcd, o: C.apricot, w: C.ivory, m: C.mint };

function canvas(w, h, fill = [0, 0, 0, 0]) {
  const px = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h; i++) px.set(fill, i * 4);
  return { w, h, px };
}
/** 24칸 그림을 (ox, oy)에 칸당 s px로. pick이 칸 문자 → 색(없으면 건너뜀). */
function draw(cv, rows, ox, oy, s, pick = (ch) => CELL[ch]) {
  rows.forEach((row, y) => [...row].forEach((ch, x) => {
    const c = pick(ch);
    if (!c) return;
    for (let py = oy + y * s; py < oy + (y + 1) * s; py++) for (let px = ox + x * s; px < ox + (x + 1) * s; px++) cv.px.set(c, (py * cv.w + px) * 4);
  }));
}

const CRC = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
const crc32 = (buf) => { let c = -1; for (const b of buf) c = CRC[(c ^ b) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
function chunk(type, body) {
  const len = Buffer.alloc(4); len.writeUInt32BE(body.length);
  const tb = Buffer.concat([Buffer.from(type), body]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(tb));
  return Buffer.concat([len, tb, crc]);
}
/** alpha=false면 RGB(불투명) — iOS 앱 아이콘은 투명을 허용하지 않는다. */
function png(cv, alpha = true) {
  const ch = alpha ? 4 : 3, raw = Buffer.alloc((cv.w * ch + 1) * cv.h);
  for (let y = 0; y < cv.h; y++) for (let x = 0; x < cv.w; x++) for (let k = 0; k < ch; k++) raw[y * (cv.w * ch + 1) + 1 + x * ch + k] = cv.px[(y * cv.w + x) * 4 + k];
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(cv.w); ihdr.writeUInt32BE(cv.h, 4); ihdr[8] = 8; ihdr[9] = alpha ? 6 : 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}
const out = (file, cv, alpha) => { writeFileSync(file, png(cv, alpha)); console.log(file, `${cv.w}×${cv.h}`); };

const basic = data.faces.basic;
// iOS 앱 아이콘 1안: 민트 1024, 칸당 36px, 왼쪽 위 (80, 60)
{ const cv = canvas(1024, 1024, C.mint); draw(cv, basic, 80, 60, 36); out('assets/icon.png', cv, false); }
// Android 적응형 A1: 108dp 캔버스(1024px)에 칸당 2.55dp ≈ 24px, 그림 범위(4~19열, 2~22줄)의 가운데를 캔버스 가운데에
const A1 = { s: 24, ox: 512 - (4 * 24 + (16 * 24) / 2), oy: 512 - (2 * 24 + (21 * 24) / 2) };
{ const cv = canvas(1024, 1024); draw(cv, basic, A1.ox, A1.oy, A1.s); out('assets/android-icon-foreground.png', cv); }
{ const cv = canvas(1024, 1024, C.mint); out('assets/android-icon-background.png', cv, false); }
// 테마 아이콘(Android 13+): 모양만 쓰므로 칠한 칸 전체를 한 색으로
{ const cv = canvas(1024, 1024); draw(cv, basic, A1.ox, A1.oy, A1.s, (ch) => (ch === '.' ? null : [0, 0, 0, 255])); out('assets/android-icon-monochrome.png', cv); }
// 스플래시: 판 없는 몸의 윤곽선만. 화면에서 168dp(칸당 7dp) — 3배 밀도로 칸당 21px, 504px
{ const cv = canvas(504, 504); draw(cv, data.splashLayers.body, 0, 0, 21, (ch) => (ch === '#' ? C.ink : null)); out('assets/splash-icon.png', cv); }
// 웹 탭 아이콘: 민트 48px, 칸당 2px
{ const cv = canvas(48, 48, C.mint); draw(cv, basic, 0, 0, 2); out('assets/favicon.png', cv, false); }
