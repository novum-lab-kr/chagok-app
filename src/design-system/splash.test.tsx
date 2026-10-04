import React from 'react';
import {afterEach,describe,expect,it,vi} from 'vitest';
import {act,cleanup,render,screen} from '@testing-library/react';
import {SplashAnimation,splashFrameAt,splashTimeline} from './splash';
afterEach(()=>{cleanup();vi.useRealTimers();});

describe('스플래시 시간표 (S2-B)',()=>{
  const tl=splashTimeline();
  it('윤곽선만 있는 몸에서 시작해 아래 줄부터 색이 찬다',()=>{
    expect(splashFrameAt(tl,0)).toMatchObject({fill:24,landed:0});
    expect(splashFrameAt(tl,200).fill).toBe(22);
    expect(splashFrameAt(tl,200+28*12).fill).toBe(10);
  });
  it('판을 받으러 두 칸씩 왼쪽 → 오른쪽 → 가운데로 움직이고, 끝나면 가운데다',()=>{
    const dxs=tl.events.map(e=>e.dx??0);
    expect(Math.min(...dxs)).toBe(-2);
    expect(Math.max(...dxs)).toBe(2);
    expect(splashFrameAt(tl,tl.total).dx??0).toBe(0);
    expect(splashFrameAt(tl,tl.total).landed).toBe(3);
  });
  it('글자는 0.1초마다 한 자씩 쓰고 커서가 따라온다',()=>{
    const first=tl.events.find(e=>e.text===1)!,second=tl.events.find(e=>e.text===2)!;
    expect(second.t-first.t).toBe(100);
    expect(first.cursor).toBe(true);
  });
  it('전체 길이는 약 2.7초다',()=>{
    expect(tl.total).toBeGreaterThan(2500);
    expect(tl.total).toBeLessThan(2900);
  });
});

describe('스플래시 화면',()=>{
  it('모션 줄이기면 마지막 장면만 보여 주고 바로 끝을 알린다',()=>{
    const onDone=vi.fn();
    render(<SplashAnimation reduceMotion onDone={onDone}/>);
    expect(screen.getByText('차곡차곡')).toBeTruthy();
    expect(onDone).toHaveBeenCalledTimes(1);
  });
  it('재생이 끝나면 한 번 끝을 알린다',()=>{
    vi.useFakeTimers();
    const onDone=vi.fn();
    render(<SplashAnimation reduceMotion={false} onDone={onDone}/>);
    expect(onDone).not.toHaveBeenCalled();
    act(()=>{vi.advanceTimersByTime(3200);});
    expect(onDone).toHaveBeenCalledTimes(1);
  });
  it('멈춘 장면(at)을 그릴 수 있다 — 시작은 글자 없음',()=>{
    render(<SplashAnimation at={0}/>);
    expect(screen.queryByText('차곡차곡')).toBeNull();
  });
});
