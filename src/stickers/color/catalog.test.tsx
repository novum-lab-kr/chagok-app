import React from 'react';
import {afterEach,describe,expect,it} from 'vitest';
import {cleanup,render,screen} from '@testing-library/react';
import {colorStickerPacks,colorStickers,getColorSticker,colorStickersInPack} from './catalog';
import {ColorStickerArtwork} from './ColorStickerArtwork';
import {pocketStickers} from '../pocket/catalog';

afterEach(cleanup);

// 한 줄 = 한 행의 연속 칸. 시안 생성기가 쓰는 형식 그대로다.
const ROW=/M(\d+) (\d+)h(\d+)v1h-(\d+)Z/g;

describe('컬러 스티커 카탈로그',()=>{
  it('묶음마다 10개씩 보이고(기본은 새싹과 운동화를 뺀 10개, 2026-11-04) 기본, 동물, 감정이 무료다',()=>{
    expect(colorStickerPacks.map(p=>[p.id,colorStickersInPack(p.id).length,p.free])).toEqual([
      ['basic',10,true],['sports_normal',10,false],['snack_normal',10,false],['objects_normal',10,false],
      ['animals_normal',10,true],['emotions_normal',10,true],['weather_normal',10,false],
      ['christmas_normal',10,false],['study_normal',10,false],['food_normal',10,false],
    ]);
    expect(colorStickers).toHaveLength(102);
    // 뺀 두 개는 그림이 남아 이미 붙인 판에서 그대로 보인다
    expect(colorStickers.map(s=>s.id)).toEqual(expect.arrayContaining(['basic.sprout','basic.shoe']));
    expect(colorStickersInPack('basic').map(s=>s.id)).toEqual(['basic.clover','basic.water','basic.book','basic.flower','basic.star','basic.cat','basic.moon','basic.pill','basic.flame','basic.music']);
  });

  it('ID는 "묶음.이름" 형식으로 겹치지 않고, 흑백 스티커 ID와도 겹치지 않는다',()=>{
    const ids=colorStickers.map(s=>s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const s of colorStickers) expect(s.id).toMatch(new RegExp(`^${s.pack}\\.[a-z]+$`));
    const pocketIds=new Set<string>(pocketStickers.map(s=>s.id));
    expect(ids.filter(id=>pocketIds.has(id))).toEqual([]);
  });

  it('모든 층은 6자리 색과 24칸 안의 행 path만 가진다',()=>{
    for (const s of colorStickers) {
      expect(s.layers.length,s.id).toBeGreaterThan(0);
      for (const layer of s.layers) {
        expect(layer.color,s.id).toMatch(/^#[0-9A-F]{6}$/);
        expect(layer.d.replace(ROW,''),s.id).toBe('');
        for (const [,x,y,w,back] of layer.d.matchAll(ROW)) {
          expect(w,s.id).toBe(back);
          expect(Number(x)+Number(w),s.id).toBeLessThanOrEqual(24);
          expect(Number(y),s.id).toBeLessThan(24);
        }
      }
    }
  });

  it('한 칸에 두 색이 겹치지 않는다',()=>{
    for (const s of colorStickers) {
      const seen=new Set<string>();
      for (const layer of s.layers) for (const [,x,y,w] of layer.d.matchAll(ROW)) {
        for (let i=0;i<Number(w);i++) {
          const cell=`${Number(x)+i},${y}`;
          expect(seen.has(cell),`${s.id} ${cell}`).toBe(false);
          seen.add(cell);
        }
      }
    }
  });

  it('모르는 ID는 물음표 그림으로 돌려준다',()=>{
    expect(getColorSticker('snack_normal.cheese').label).toBe('치즈');
    // 더 새 버전의 스티커가 동기화로 들어와도 멈추지 않고 물음표로 그린다(2026-11-04)
    const unknown=getColorSticker('snack_normal.nothing' as never);
    expect(unknown).toMatchObject({id:'snack_normal.nothing',label:'알 수 없는 스티커',pack:'basic'});
    expect(unknown.layers.length).toBeGreaterThan(0);
  });
});

describe('ColorStickerArtwork',()=>{
  it('색 층마다 path를 그리고 이름을 접근성 라벨로 붙인다',()=>{
    const sticker=getColorSticker('weather_normal.snowman');
    const {container}=render(<ColorStickerArtwork id="weather_normal.snowman" size={48}/>);
    const svg=screen.getByRole('img',{name:'눈사람'});
    expect(svg.getAttribute('width')).toBe('48');
    expect(svg.getAttribute('viewBox')).toBe('0 0 24 24');
    const fills=[...container.querySelectorAll('path')].map(p=>p.getAttribute('fill')?.toUpperCase());
    expect(fills).toEqual(sticker.layers.map(l=>l.color));
  });
});
