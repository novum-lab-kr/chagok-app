// 영어 스토어 스크린샷 1.1.0: gen8.mjs(한국어 1.1.0 확정본)와 같은 구성, 순서, 모양에 영어 화면(raw8-en/)과 영어 문구를 얹는다.
// 원본은 모두 raw8-en/에서 읽는다(기기 언어 영어로 1.1.0 Release 빌드에서 다시 찍음, seed8-en.mjs). 워치 원본은 raw8-en/watch/.
// 결과: final-1.1.0-en/<6.9|6.3>/NN.png, final-1.1.0-en/watch/NN.png, final-1.1.0-en/extra/<6.9|6.3>/new-together-invite.png(예비 장),
//       out8-en/sheet.png(커밋 안 함)
// node gen8-en.mjs
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const DIR = HERE;
const RAW = path.join(HERE, 'raw8-en');
const ROOT = path.resolve(DIR, '../../../..');
const FONT = `${ROOT}/src/design-system/assets/neodgm-1.601.ttf`;
const ART = `${ROOT}/assets/widget-art`;
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const OUT = path.join(HERE, 'final-1.1.0-en');
const SIZES = { '6.9': [1320, 2868], '6.3': [1206, 2622] };
const INK = '#06261C', IVORY = '#FEF1D1', MINT = '#AFE1CB', APRICOT = '#FD855F';
const raw = (f) => `file://${RAW}/${f}`;
const art = (f) => `file://${ART}/color-${f}.png`;

// gen8.mjs와 같은 장, 같은 순서, 같은 장식. crop: 원본에서 보여 줄 부분 [x, y, w, h]
// step은 화면에 그리지 않는다(한국어 세트와 같다). 장 이름으로만 쓴다.
const SLIDES = [
  { main: 'place.png', step: 'Stick', title: 'Did it today?<br>Add a <em>sticker</em>', sub: 'Tap an empty slot to place one',
    crop: [40, 440, 1240, 1820], deco: ['basic-star', 'basic-book'] },
  { main: 'home.png', step: 'Many goals', title: 'A <em>board</em> for<br>each goal', sub: 'Reading, walks and water,<br>each filled on its own',
    crop: [0, 200, 1320, 1720], deco: ['basic-shoe', 'animals_normal-whale'] },
  { main: 'record.png', step: 'Notes', title: 'A <em>photo</em> and<br>a <em>note</em>', sub: 'Only on the days you want',
    crop: [40, 420, 1240, 1660], deco: ['basic-flower', 'emotions_normal-happy'] },
  { main: 'records.png', step: 'Look back', title: 'Look <em>back</em> on<br>your days', sub: 'Photos and notes from your sticker days',
    crop: [0, 340, 1320, 1600], deco: ['animals_normal-cat', 'basic-star'] },
  { main: 'mood.png', step: 'Mood', title: 'Your <em>mood</em>,<br>day by day', sub: 'Pick the face that fits today',
    crop: [40, 440, 1240, 1700], deco: ['emotions_normal-love', 'emotions_normal-excited'] },
  { main: 'walk.png', step: 'Calendar', title: 'Fill your days<br>on a <em>calendar</em>', sub: 'Leave the empty days,<br>and stick one on today',
    crop: [40, 440, 1240, 1700], deco: ['basic-shoe', 'animals_normal-dog'] },
  { kind: 'watch', main: 'widget.png', watch: 'drop.png', step: 'Widgets and Watch', title: '<em>Home Screen</em><br>and <em>wrist</em> too', sub: 'See it in a widget, stick from Apple Watch',
    crop: [0, 240, 1320, 1700], deco: ['basic-sprout'] },
  { main: 'stickers.png', step: 'Decorate', title: 'Decorate with<br><em>stickers</em>', sub: 'Start with the basic set,<br>and buy more if you like',
    // 아래 「3-day trial」 카드는 crop 밖이다(지침 2.3.7)
    crop: [0, 240, 1320, 1900], deco: ['animals_normal-rabbit', 'emotions_normal-shy'] },
  { main: 'together-one.png', step: 'Together', title: '<em>One board</em><br>with a friend', sub: 'Each slot shows who placed it',
    crop: [40, 230, 1240, 1640], deco: ['basic-water', 'animals_normal-cat'] },
  { main: 'together-each.png', step: 'Together', title: '<em>Own boards</em>,<br>side by side', sub: 'Same goal, each friend fills their own',
    crop: [40, 230, 1240, 1640], deco: ['basic-star', 'animals_normal-rabbit'] },
];
// 예비 장(10장 한도라 기본 세트에서 뺐다): 친구와 함께 만들기 화면
const EXTRA = [
  { main: 'together-new.png', step: 'Together', title: 'Ask a <em>friend</em><br>to join you', sub: 'Choose how to fill it and send a link',
    crop: [0, 330, 1320, 1900], deco: ['basic-clover', 'animals_normal-chick'] },
];

const WATCH = [
  { src: 'list.png', cap: 'Pick a <em>goal</em>' },
  { src: 'goal.png', cap: 'Stick right on your <em>wrist</em>' },
  { src: 'drop.png', cap: 'Stick, and a <em>block</em> drops' },
  { src: 'store.png', cap: 'Full? Into the <em>box</em>' },
];

function css(W, H, k) {
  const px = (n) => `${Math.round(n * k)}px`;
  return {
    px,
    base: `@font-face{font-family:N;src:url(file://${FONT})}
      *{margin:0;box-sizing:border-box} html,body{width:${W}px;height:${H}px;overflow:hidden}
      body{font-family:N;color:${INK};word-break:keep-all;position:relative}
      h1{font-weight:normal;line-height:1.16;letter-spacing:${px(2)}}
      p{line-height:1.45}
      .deco{position:absolute;image-rendering:pixelated;z-index:6}`,
  };
}

// 화면 한 장을 테두리 상자 안에 넣는다. cropH까지만 보이고 나머지는 아래로 흘린다
function screen(src, { left, top, w, border, radius, shadow, rot = 0, cropH = 2868, cropY = 0, cropX = 0, cropW = 1320, z = 2 }, px) {
  const sc = w / cropW;
  return `<div style="position:absolute;left:${px(left)};top:${px(top)};z-index:${z};transform:rotate(${rot}deg);background:${INK};padding:${px(border)};border-radius:${px(radius)};box-shadow:${shadow}">
    <div style="width:${px(w)};height:${px(cropH * sc)};overflow:hidden;position:relative;border-radius:${px(Math.max(radius - border, 0))}">
      <img src="${src}" style="position:absolute;max-width:none;width:${px(1320 * sc)};left:${px(-cropX * sc)};top:${px(-cropY * sc)}"></div></div>`;
}

function decoImg(name, x, y, size, rot, px, shadow = 'rgba(6,38,28,.35)') {
  return `<img class="deco" src="${art(name)}" style="left:${px(x)};top:${px(y)};width:${px(size)};transform:rotate(${rot}deg);filter:drop-shadow(${px(10)} ${px(12)} 0 ${shadow})">`;
}

function watchCard(src, left, top, rot, px, shadow) {
  return `<div style="position:absolute;z-index:4;left:${px(left)};top:${px(top)};background:${INK};padding:${px(24)};border-radius:${px(120)};box-shadow:${shadow};transform:rotate(${rot}deg)">
    <div style="width:${px(540)};height:${px(540 * 496 / 416)};overflow:hidden;border-radius:${px(96)}"><img src="file://${RAW}/watch/${src}" style="width:100%;display:block"></div></div>`;
}

// b 크게 잘라 보기 (한국어 1.1.0 세트와 같은 안)
function slideB(s, i, W, H) {
  const k = W / 1320, { px, base } = css(W, H, k);
  const st = `${base} body{background:${INK};color:${IVORY}}
    h1{font-size:${px(156)};text-align:center} h1 em{font-style:normal;color:${APRICOT}}
    p{font-size:${px(54)};margin-top:${px(28)};color:${MINT};text-align:center}`;
  const cap = `<div style="position:absolute;top:${px(170)};left:${px(60)};right:${px(60)};z-index:5"><h1>${s.title}</h1><p>${s.sub}</p></div>`;
  const [cx, cy, cw, ch] = s.crop;
  const rot = i % 2 ? 2 : -2;
  let body = screen(raw(s.main), { left: 50, top: 860, w: 1220, border: 0, radius: 64, rot, cropX: cx, cropY: cy, cropW: cw, cropH: ch,
    shadow: `0 0 0 ${px(10)} ${MINT}, ${px(26)} ${px(30)} 0 ${px(10)} rgba(0,0,0,.45)` }, px);
  if (s.kind === 'watch') body += watchCard(s.watch, 690, 1900, 5, px, `0 0 0 ${px(10)} ${MINT}, ${px(20)} ${px(24)} 0 ${px(10)} rgba(0,0,0,.45)`);
  const [d1, d2] = s.deco;
  body += decoImg(d1, i % 2 ? 1010 : 30, 700, 280, i % 2 ? 12 : -12, px, 'rgba(0,0,0,.45)');
  if (d2 && s.kind !== 'watch') body += decoImg(d2, i % 2 ? 40 : 1000, 2460, 300, i % 2 ? -10 : 10, px, 'rgba(0,0,0,.45)');
  return `<meta charset="utf-8"><html lang="en"><style>${st}</style>${cap}${body}`;
}

// Watch: 한국어 세트와 같은 B안(먹색 바탕, 위쪽 문구, 살구색 강조)
function watchHtml(s) {
  const W = 416, H = 496, accent = APRICOT;
  return `<meta charset="utf-8"><style>@font-face{font-family:N;src:url(file://${FONT})} *{margin:0;box-sizing:border-box}
    html,body{width:${W}px;height:${H}px;overflow:hidden} body{font-family:N;position:relative;background:${INK};color:${IVORY}}
    em{font-style:normal;color:${accent}}</style>
    <div style="height:78px;display:flex;align-items:center;justify-content:center;font-size:31px;word-break:keep-all;white-space:nowrap"><span>${s.cap}</span></div>
    <img src="file://${RAW}/watch/${s.src}" style="position:absolute;left:${(W - 384) / 2}px;top:78px;width:384px;border-radius:44px 44px 0 0;box-shadow:0 0 0 4px ${accent}">`;
}

function shoot(html, file, W, H) {
  const f = file.replace(/\.png$/, '.html');
  fs.writeFileSync(f, html);
  // 맥이 바쁘면 Chrome이 그림을 쓴 뒤 종료 감시에 걸려 2로 끝나거나, 아예 멈춘다. 그림이 있으면 넘어가고, 없으면 세 번까지 다시 찍는다
  for (let attempt = 1; ; attempt++) {
    fs.rmSync(file, { force: true });
    try {
      execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1',
        '--allow-file-access-from-files', `--window-size=${W},${H}`, `--screenshot=${file}`, `file://${f}`], { stdio: 'ignore', timeout: 120000 });
    } catch (e) {
      if (!fs.existsSync(file) && attempt >= 3) throw e;
    }
    if (fs.existsSync(file)) break;
  }
  fs.rmSync(f);
}

const NN = (i) => String(i + 1).padStart(2, '0');
fs.rmSync(OUT, { recursive: true, force: true });
for (const [name, [W, H]] of Object.entries(SIZES)) {
  const out = path.join(OUT, name);
  fs.mkdirSync(out, { recursive: true });
  SLIDES.forEach((s, i) => shoot(slideB(s, i, W, H), path.join(out, `${NN(i)}.png`), W, H));
  const ex = path.join(OUT, 'extra', name);
  fs.mkdirSync(ex, { recursive: true });
  EXTRA.forEach((s) => shoot(slideB(s, SLIDES.length, W, H), path.join(ex, 'new-together-invite.png'), W, H));
}
const wout = path.join(OUT, 'watch');
fs.mkdirSync(wout, { recursive: true });
const hasWatch = WATCH.every((w) => fs.existsSync(path.join(RAW, 'watch', w.src)));
if (hasWatch) WATCH.forEach((s, i) => shoot(watchHtml(s), path.join(wout, `${NN(i)}.png`), 416, 496));

// 한 장짜리 시트: 위에 iPhone 6.9 열 장과 예비 장, 아래 Watch 네 장
const n = SLIDES.length, SW = (n + 1) * 300 + (n + 2) * 24;
const ph = SLIDES.map((s, i) => `<div><img src="file://${OUT}/6.9/${NN(i)}.png" style="width:300px;display:block"><p>${NN(i)} ${s.step}</p></div>`).join('')
  + `<div style="opacity:.75"><img src="file://${OUT}/extra/6.9/new-together-invite.png" style="width:300px;display:block"><p>Extra</p></div>`;
const wa = hasWatch ? WATCH.map((_, i) => `<img src="file://${wout}/${NN(i)}.png" style="width:300px;display:block;border-radius:40px">`).join('') : '<p>(no watch raws)</p>';
fs.mkdirSync(path.join(HERE, 'out8-en'), { recursive: true });
shoot(`<meta charset="utf-8"><style>@font-face{font-family:N;src:url(file://${FONT})} *{margin:0;box-sizing:border-box}
  body{width:${SW}px;background:#5b6b65;font-family:N;color:${IVORY};padding:24px} .r{display:flex;gap:24px;margin-top:16px}
  h2{font-weight:normal;font-size:40px} p{font-size:28px;margin-top:8px;text-align:center}</style>
  <h2>1.1.0 English iPhone ${n} (6.9 inch) + 1 extra</h2><div class="r">${ph}</div><h2 style="margin-top:32px">Apple Watch 4</h2><div class="r">${wa}</div>`,
path.join(HERE, 'out8-en', 'sheet.png'), SW, 24 + 48 + 16 + 652 + 44 + 32 + 48 + 16 + 358 + 24);
