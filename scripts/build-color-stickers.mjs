// 컬러 스티커 원본(src/stickers/color/source/sticker-packs-24.json)을 앱용 데이터로 옮긴다.
// 실행: node scripts/build-color-stickers.mjs
// 원본의 묶음·스티커 ID는 시안 단계 이름이라, 앱 ID는 "묶음.이름"으로 다시 붙인다.
import fs from 'node:fs';
import path from 'node:path';

const dir=path.resolve('src/stickers/color');
const source=JSON.parse(fs.readFileSync(path.join(dir,'source/sticker-packs-24.json'),'utf8'));

const PACK_IDS = { free: 'basic', sports: 'sports_normal', snack: 'snack_normal', objects: 'objects_normal', animals: 'animals_normal', emotions: 'emotions_normal', weather: 'weather_normal' };
const STICKER_IDS={'weather.sun2':'sun'};

const lines=source.stickers.map(s=>{
  const pack=PACK_IDS[s.theme]??s.theme;
  const id=`${pack}.${STICKER_IDS[`${s.theme}.${s.id}`]??s.id}`;
  const layers=s.layers.map(l=>`{color:'${l.color.toUpperCase()}',d:'${l.d}'}`).join(',');
  return `  {id:'${id}',label:'${s.name}',pack:'${pack}',layers:[${layers}]},`;
});

fs.writeFileSync(path.join(dir,'stickers.generated.ts'),`// 생성 파일 — 직접 고치지 않는다. scripts/build-color-stickers.mjs로 다시 만든다.
import type {ColorStickerDefinition} from './catalog';

export const colorStickerData=[
${lines.join('\n')}
] as const satisfies readonly ColorStickerDefinition[];
`);
console.log(`${lines.length}종 → src/stickers/color/stickers.generated.ts`);
