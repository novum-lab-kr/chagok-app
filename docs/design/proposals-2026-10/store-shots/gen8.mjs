// 스토어 스크린샷 8판(1.1.0): 1.0.0 제출본(gen7 b안 「크게 잘라 보기」) 모양 그대로, 바뀐 장은 1.1.0 원본(raw8/)으로,
// 함께 목표 장을 더한다. 화면이 바뀌지 않은 장(03 기록, 04 다시 보기, 07 위젯과 워치)은 raw6/ 그대로.
// 02 목표 목록은 01 붙이기 뒤(책 11칸, 73%)로 raw8/home.png에서 다시 찍었다(2026-11-06, 01과 07 위젯의 73%에 맞춤).
// 결과: final-1.1.0/<6.9|6.3>/NN.png, final-1.1.0/watch/NN.png(1.0.0 그대로 복사), final-1.1.0/extra/<6.9|6.3>/new-together.png(예비 장), out8/sheet8.png(커밋 안 함)
// node gen8.mjs
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const DIR = HERE;
const RAW8 = path.join(HERE, 'raw8');
const ROOT = path.resolve(DIR, '../../../..');
const FONT = `${ROOT}/src/design-system/assets/neodgm-1.601.ttf`;
const ART = `${ROOT}/assets/widget-art`;
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const OUT = path.join(HERE, 'final-1.1.0');
const SIZES = { '6.9': [1320, 2868], '6.3': [1206, 2622] };
const INK = '#06261C', IVORY = '#FEF1D1', MINT = '#AFE1CB', LIME = '#C9DD94', APRICOT = '#FD855F';
// 1.1.0에서 다시 찍은 원본만 raw8/에서 읽는다
const NEW_RAW = new Set(['place.png', 'home.png', 'mood.png', 'walk.png', 'stickers.png', 'together-one.png', 'together-each.png', 'together-new.png']);
const raw = (f) => `file://${NEW_RAW.has(f) ? RAW8 : `${DIR}/raw6`}/${f}`;
const art = (f) => `file://${ART}/color-${f}.png`;

// crop: 원본에서 보여 줄 부분 [x, y, w, h] (b안), zoom: a안 확대 조각 [x, y, w, h] / 놓을 폭 / 자리
// deco: 장식 스티커(무료 묶음만: 기본, 동물, 감정)
const SLIDES = [
  { main: 'place.png', step: '붙이기', title: '해낸 날,<br><em>스티커</em> 한 칸', sub: '빈칸을 누르면 스티커가 붙어요',
    crop: [40, 440, 1240, 1820], zoom: [500, 1605, 320, 280], zw: 520, zx: 740, zy: 1700, deco: ['basic-star', 'basic-book'] },
  { main: 'home.png', step: '여러 목표', title: '목표마다<br><em>판</em> 하나씩', sub: '책 읽기, 산책, 물 마시기를 따로 채워요',
    crop: [0, 200, 1320, 1720], deco: ['basic-shoe', 'animals_normal-whale'] },
  { main: 'record.png', step: '기록', title: '<em>사진</em> 한 장,<br><em>메모</em> 한 줄', sub: '남기고 싶은 날에만 적어요',
    crop: [40, 420, 1240, 1660], deco: ['basic-flower', 'emotions_normal-happy'] },
  { main: 'records.png', step: '다시 보기', title: '쌓인 날을<br><em>다시</em> 봐요', sub: '붙인 날의 사진과 메모를 모아 봐요',
    crop: [0, 340, 1320, 1600], deco: ['animals_normal-cat', 'basic-star'] },
  { main: 'mood.png', step: '기분', title: '그날 <em>기분</em>도<br>한 칸씩', sub: '마음에 맞는 표정을 골라 붙여요',
    crop: [40, 440, 1240, 1700], zoom: [148, 1321, 584, 174], zw: 760, zx: 480, zy: 2000, deco: ['emotions_normal-love', 'emotions_normal-excited'] },
  { main: 'walk.png', step: '달력', title: '<em>달력</em>에<br>하루씩 채워요', sub: '빈 날은 두고, 오늘 다시 붙여요',
    crop: [40, 440, 1240, 1700], zoom: [292, 1495, 728, 174], zw: 900, zx: 340, zy: 2000, deco: ['basic-shoe', 'animals_normal-dog'] },
  { kind: 'watch', main: 'widget.png', watch: 'drop.png', step: '위젯과 워치', title: '<em>홈 화면</em>과<br><em>손목</em>에서도', sub: '위젯으로 보고, Apple Watch로 붙여요',
    crop: [0, 240, 1320, 1700], deco: ['basic-sprout'] },
  { main: 'stickers.png', step: '꾸미기', title: '<em>스티커</em>로<br>꾸며요', sub: '기본 스티커로 꾸미고,<br>원하면 사서 더 많이 골라요',
    // 1.1.0 스티커 탭에는 무료 묶음의 「무료」 배지가 없어 가릴 것이 없다. 아래 「3일 무료」(체험) 카드는 crop 밖이다(지침 2.3.7)
    crop: [0, 240, 1320, 1900], deco: ['animals_normal-rabbit', 'emotions_normal-shy'] },
  // 1.1.0 새 기능: 함께 목표 (PRD 4.15). 문구는 초안
  { main: 'together-one.png', step: '함께 목표', title: '친구와 <em>한 판</em>에<br>같이 붙여요', sub: '칸마다 붙인 사람의 스티커가 보여요',
    crop: [40, 230, 1240, 1640], deco: ['basic-water', 'animals_normal-cat'] },
  { main: 'together-each.png', step: '함께 목표', title: '<em>각자 판</em>을<br>나란히 봐요', sub: '같은 목표를 친구와 따로 채워요',
    crop: [40, 230, 1240, 1640], deco: ['basic-star', 'animals_normal-rabbit'] },
];
// 예비 장(10장 한도라 기본 세트에서 뺐다): 친구와 함께 만들기 화면
const EXTRA = [
  { main: 'together-new.png', step: '함께 목표', title: '친구를 <em>초대</em>해<br>함께 시작해요', sub: '채우는 방법을 고르고 링크를 보내요',
    crop: [0, 330, 1320, 1900], deco: ['basic-clover', 'animals_normal-chick'] },
];

const WATCH = [
  { src: 'list.png', cap: '붙일 <em>목표</em>를 골라요' },
  { src: 'goal.png', cap: '손목에서 <em>바로</em> 붙여요' },
  { src: 'drop.png', cap: '붙이면 <em>블록</em>이 톡' },
  { src: 'store.png', cap: '다 차면 <em>보관함</em>으로' },
];

const A_BG = [MINT, IVORY, LIME, MINT, IVORY, LIME, MINT, IVORY];

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
function screen(src, { left, top, w, border, radius, shadow, rot = 0, cropH = 2868, cropY = 0, cropX = 0, cropW = 1320, z = 2, masks = [] }, px) {
  const sc = w / cropW;
  const cover = masks.map(([mx, my, mw, mh]) => `<div style="position:absolute;background:${IVORY};left:${px((mx - cropX) * sc)};top:${px((my - cropY) * sc)};width:${px(mw * sc)};height:${px(mh * sc)}"></div>`).join('');
  return `<div style="position:absolute;left:${px(left)};top:${px(top)};z-index:${z};transform:rotate(${rot}deg);background:${INK};padding:${px(border)};border-radius:${px(radius)};box-shadow:${shadow}">
    <div style="width:${px(w)};height:${px(cropH * sc)};overflow:hidden;position:relative;border-radius:${px(Math.max(radius - border, 0))}">
      <img src="${src}" style="position:absolute;max-width:none;width:${px(1320 * sc)};left:${px(-cropX * sc)};top:${px(-cropY * sc)}">${cover}</div></div>`;
}

function decoImg(name, x, y, size, rot, px, shadow = 'rgba(6,38,28,.35)') {
  return `<img class="deco" src="${art(name)}" style="left:${px(x)};top:${px(y)};width:${px(size)};transform:rotate(${rot}deg);filter:drop-shadow(${px(10)} ${px(12)} 0 ${shadow})">`;
}

function watchCard(src, left, top, rot, px, shadow) {
  return `<div style="position:absolute;z-index:4;left:${px(left)};top:${px(top)};background:${INK};padding:${px(24)};border-radius:${px(120)};box-shadow:${shadow};transform:rotate(${rot}deg)">
    <div style="width:${px(540)};height:${px(540 * 496 / 416)};overflow:hidden;border-radius:${px(96)}"><img src="file://${DIR}/watch6/${src}" style="width:100%;display:block"></div></div>`;
}

// a 출시 영상 결
function slideA(s, i, W, H) {
  const k = W / 1320, { px, base } = css(W, H, k);
  const shadowHard = `${px(22)} ${px(22)} 0 rgba(6,38,28,.85)`;
  const st = `${base} body{background:${A_BG[i]}}
    .badge{display:inline-block;background:${INK};color:${IVORY};font-size:${px(56)};padding:${px(10)} ${px(26)};border-radius:${px(14)}}
    h1{font-size:${px(150)};margin-top:${px(34)};-webkit-text-stroke:${px(3)} ${INK}} h1 em{font-style:normal;color:${APRICOT}}
    p{font-size:${px(54)};margin-top:${px(26)};color:#2c4a3f}`;
  const cap = `<div style="position:absolute;top:${px(170)};left:${px(96)};right:${px(80)};z-index:5">
    <span class="badge">${String(i + 1).padStart(2, '0')} ${s.step}</span><h1>${s.title}</h1><p>${s.sub}</p></div>`;
  let body = screen(raw(s.main), { left: 60, top: 1000, w: 1180, border: 22, radius: 120, shadow: shadowHard, masks: s.masks }, px);
  if (s.zoom) {
    const [zx, zy, zw, zh] = s.zoom, sc = s.zw / zw;
    body += `<div style="position:absolute;z-index:4;left:${px(s.zx)};top:${px(s.zy)};background:${INK};padding:${px(12)};border-radius:${px(36)};box-shadow:${shadowHard};transform:rotate(${i % 2 ? -3 : 3}deg)">
      <div style="width:${px(s.zw)};height:${px(zh * sc)};overflow:hidden;position:relative;border-radius:${px(26)}">
      <img src="${raw(s.main)}" style="position:absolute;max-width:none;image-rendering:pixelated;width:${px(1320 * sc)};left:${px(-zx * sc)};top:${px(-zy * sc)}"></div></div>`;
  }
  if (s.kind === 'watch') body += watchCard(s.watch, 700, 1880, -4, px, shadowHard);
  return `<meta charset="utf-8"><style>${st}</style>${cap}${body}`;
}

// b 크게 잘라 보기
function slideB(s, i, W, H) {
  const k = W / 1320, { px, base } = css(W, H, k);
  const st = `${base} body{background:${INK};color:${IVORY}}
    h1{font-size:${px(156)};text-align:center} h1 em{font-style:normal;color:${APRICOT}}
    p{font-size:${px(54)};margin-top:${px(28)};color:${MINT};text-align:center}`;
  const cap = `<div style="position:absolute;top:${px(170)};left:${px(60)};right:${px(60)};z-index:5"><h1>${s.title}</h1><p>${s.sub}</p></div>`;
  const [cx, cy, cw, ch] = s.crop;
  const rot = i % 2 ? 2 : -2;
  let body = screen(raw(s.main), { left: 50, top: 860, w: 1220, border: 0, radius: 64, rot, cropX: cx, cropY: cy, cropW: cw, cropH: ch, masks: s.masks,
    shadow: `0 0 0 ${px(10)} ${MINT}, ${px(26)} ${px(30)} 0 ${px(10)} rgba(0,0,0,.45)` }, px);
  if (s.kind === 'watch') body += watchCard(s.watch, 690, 1900, 5, px, `0 0 0 ${px(10)} ${MINT}, ${px(20)} ${px(24)} 0 ${px(10)} rgba(0,0,0,.45)`);
  const [d1, d2] = s.deco;
  body += decoImg(d1, i % 2 ? 1010 : 30, 700, 280, i % 2 ? 12 : -12, px, 'rgba(0,0,0,.45)');
  if (d2 && s.kind !== 'watch') body += decoImg(d2, i % 2 ? 40 : 1000, 2460, 300, i % 2 ? -10 : 10, px, 'rgba(0,0,0,.45)');
  return `<meta charset="utf-8"><style>${st}</style>${cap}${body}`;
}

// c 이어지는 파노라마: 여덟 장을 한 그림(8×1320 폭)으로 그리고 장마다 그 자리만 보여 준다
function slideC(i, W, H) {
  const k = W / 1320, { px, base } = css(W, H, k);
  const N = SLIDES.length, PW = 1320 * N;
  const st = `${base} body{background:${APRICOT}}
    h1{font-size:${px(150)};text-align:center;-webkit-text-stroke:${px(3)} ${INK}} h1 em{font-style:normal;background:linear-gradient(transparent 52%, ${IVORY} 52%, ${IVORY} 92%, transparent 92%)}
    p{font-size:${px(54)};margin-top:${px(26)};text-align:center;color:#3a1d12}`;
  // 아이보리 띠: 장마다 높낮이가 바뀌며 다음 장으로 이어진다
  const ys = [1900, 1500, 2050, 1600, 2000, 1550, 1950, 1650, 1900];
  const pts = ys.map((y, n) => `${n * 1320 * k}px ${y * k}px`);
  let world = `<div style="position:absolute;left:0;top:0;width:${px(PW)};height:${H}px;background:${IVORY};clip-path:polygon(${pts.join(',')},${PW * k}px ${H}px,0 ${H}px)"></div>`;
  SLIDES.forEach((s, n) => {
    const x0 = n * 1320, rot = n % 2 ? 5 : -5;
    world += `<div style="position:absolute;top:${px(170)};left:${px(x0 + 70)};width:${px(1180)};z-index:5"><h1>${s.title}</h1><p>${s.sub}</p></div>`;
    world += screen(raw(s.main), { left: x0 + 90, top: 920, w: 1140, border: 20, radius: 116, rot, z: 3, masks: s.masks,
      shadow: `${px(24)} ${px(24)} 0 rgba(6,38,28,.9)` }, px);
    if (s.kind === 'watch') world += watchCard(s.watch, x0 + 700, 1900, -6, px, `${px(20)} ${px(20)} 0 rgba(6,38,28,.9)`);
    // 장과 장 사이에 걸치는 스티커: 앞 장 오른쪽 끝과 다음 장 왼쪽 끝에 반씩 보인다
    if (n < N - 1) world += decoImg(s.deco[0], x0 + 1320 - 170, 1150 + (n % 2) * 700, 340, n % 2 ? 14 : -14, px);
  });
  return `<meta charset="utf-8"><style>${st}</style><div style="position:absolute;left:${-i * W}px;top:0;width:${PW * k}px;height:${H}px">${world}</div>`;
}

// Watch: 고른 B안(먹색 바탕, 위쪽 문구)을 바탕으로 화면을 더 크게, 안마다 강조색만 맞춘다
function watchHtml(v, s) {
  const W = 416, H = 496, accent = { a: MINT, b: APRICOT, c: APRICOT }[v];
  return `<meta charset="utf-8"><style>@font-face{font-family:N;src:url(file://${FONT})} *{margin:0;box-sizing:border-box}
    html,body{width:${W}px;height:${H}px;overflow:hidden} body{font-family:N;position:relative;background:${INK};color:${IVORY}}
    em{font-style:normal;color:${accent}}</style>
    <div style="height:78px;display:flex;align-items:center;justify-content:center;font-size:31px;word-break:keep-all"><span>${s.cap}</span></div>
    <img src="file://${DIR}/watch6/${s.src}" style="position:absolute;left:${(W - 384) / 2}px;top:78px;width:384px;border-radius:44px 44px 0 0;box-shadow:0 0 0 4px ${accent}">`;
}

function shoot(html, file, W, H) {
  const f = file.replace(/\.png$/, '.html');
  fs.writeFileSync(f, html);
  // 맥이 바쁘면 Chrome이 그림을 쓴 뒤 종료 감시에 걸려 2로 끝나거나, 아예 멈춘다. 그림이 있으면 넘어가고, 없으면 세 번까지 다시 찍는다(gen8-en.mjs와 같다)
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

// b안만 만든다(1.0.0 제출본이 b안). 바뀐 장의 번호와 이유는 CHANGED에 적어 changed/로도 모은다.
const CHANGED = {
  '01': 'place-progress-bar', '02': 'home-book-73', '05': 'mood-progress-bar', '06': 'walk-progress-bar', '08': 'stickers-clover-and-no-free-badge',
  '09': 'new-together-one-board', '10': 'new-together-each-board',
};
const NN = (i) => String(i + 1).padStart(2, '0');
fs.rmSync(OUT, { recursive: true, force: true });
const CH = path.join(HERE, 'changed');
fs.rmSync(CH, { recursive: true, force: true });
for (const [name, [W, H]] of Object.entries(SIZES)) {
  const out = path.join(OUT, name);
  fs.mkdirSync(out, { recursive: true });
  fs.mkdirSync(path.join(CH, name), { recursive: true });
  SLIDES.forEach((s, i) => {
    const file = path.join(out, `${NN(i)}.png`);
    shoot(slideB(s, i, W, H), file, W, H);
    if (CHANGED[NN(i)]) fs.copyFileSync(file, path.join(CH, name, `${NN(i)}-${CHANGED[NN(i)]}.png`));
  });
  const ex = path.join(OUT, 'extra', name);
  fs.mkdirSync(ex, { recursive: true });
  EXTRA.forEach((s) => {
    const file = path.join(ex, 'new-together-invite.png');
    shoot(slideB(s, SLIDES.length, W, H), file, W, H);
    fs.copyFileSync(file, path.join(CH, name, `extra-new-together-invite.png`));
  });
}
// 워치: 1.1.0에서 한국어 화면이 바뀌지 않아 1.0.0 최종본을 그대로 쓴다
const wout = path.join(OUT, 'watch');
fs.mkdirSync(wout, { recursive: true });
WATCH.forEach((_, i) => fs.copyFileSync(path.join(DIR, 'final/watch', `${NN(i)}.png`), path.join(wout, `${NN(i)}.png`)));

// 한 장짜리 시트: 위에 iPhone 6.9 열 장(바뀐 장과 새 장에 표시), 예비 장, 아래 Watch 네 장
const n = SLIDES.length, SW = (n + 1) * 300 + (n + 2) * 24;
const tag = (i) => (CHANGED[NN(i)] ? (CHANGED[NN(i)].startsWith('new') ? '새 장' : '교체') : '그대로');
const ph = SLIDES.map((_, i) => `<div><img src="file://${OUT}/6.9/${NN(i)}.png" style="width:300px;display:block"><p>${NN(i)} ${tag(i)}</p></div>`).join('')
  + `<div style="opacity:.75"><img src="file://${OUT}/extra/6.9/new-together-invite.png" style="width:300px;display:block"><p>예비 장</p></div>`;
const wa = WATCH.map((_, i) => `<img src="file://${wout}/${NN(i)}.png" style="width:300px;display:block;border-radius:40px">`).join('');
shoot(`<meta charset="utf-8"><style>@font-face{font-family:N;src:url(file://${FONT})} *{margin:0;box-sizing:border-box}
  body{width:${SW}px;background:#5b6b65;font-family:N;color:${IVORY};padding:24px} .r{display:flex;gap:24px;margin-top:16px}
  h2{font-weight:normal;font-size:40px} p{font-size:28px;margin-top:8px;text-align:center}</style>
  <h2>1.1.0 iPhone ${n}장 (6.9인치) + 예비 1장</h2><div class="r">${ph}</div><h2 style="margin-top:32px">Apple Watch 4장 (1.0.0 그대로)</h2><div class="r">${wa}</div>`,
(fs.mkdirSync(path.join(HERE, 'out8'), { recursive: true }), path.join(HERE, 'out8', 'sheet8.png')), SW, 24 + 48 + 16 + 652 + 44 + 32 + 48 + 16 + 358 + 24);
