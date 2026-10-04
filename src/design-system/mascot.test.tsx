import React from 'react';
import {afterEach,describe,expect,it} from 'vitest';
import {cleanup,render} from '@testing-library/react';
import {Mascot,mascotFaces,mascotPaths} from './mascot';
import {retro} from './tokens';
afterEach(cleanup);

describe('메인 캐릭터',()=>{
  it('같은 색 가로 칸을 한 사각형으로 묶는다',()=>{
    const paths=mascotPaths(['.##.','#gg#']);
    expect(paths).toEqual([
      {color:retro.color.ink,d:'M1 0H3V1H1Z M0 1H1V2H0Z M3 1H4V2H3Z'},
      {color:retro.color.lcd,d:'M1 1H3V2H1Z'},
    ]);
  });
  it('칸 문자는 디자인 시스템 팔레트로만 칠한다',()=>{
    const colors=mascotPaths(['#gowm']).map(p=>p.color);
    expect(colors).toEqual([retro.color.ink,retro.color.lcd,retro.color.primary,retro.color.secondary,retro.color.screen]);
  });
  it('모르는 칸 문자는 그리지 않고 알린다',()=>{
    expect(()=>mascotPaths(['#x'])).toThrow('x');
  });
  it('표정 10개를 모두 24칸으로 그린다',()=>{
    expect(mascotFaces).toHaveLength(10);
    for (const face of mascotFaces) {
      const {container}=render(<Mascot pose={face} size={48}/>);
      expect(container.querySelector('svg')?.getAttribute('viewBox')).toBe('0 0 24 24');
      cleanup();
    }
  });
  it('이름을 주면 그림으로 읽히고, 없으면 꾸밈으로 숨긴다',()=>{
    const {container,rerender}=render(<Mascot label="웃는 차곡이"/>);
    expect(container.querySelector('[aria-label="웃는 차곡이"]')).toBeTruthy();
    rerender(<Mascot/>);
    expect(container.querySelector('[aria-hidden="true"]')).toBeTruthy();
  });
});
