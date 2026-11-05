import React from 'react';
import {afterEach,describe,expect,it} from 'vitest';
import {act,cleanup,render,screen} from '@testing-library/react';
import {Pressable} from 'react-native';
import {RetroScreen,useScrollLock} from './composition-controls';
import {PixelText} from './components';
import {compactDayWidth,isHorizontalSwipe} from './board-screens';
afterEach(cleanup);

/** 화면 가운데(x 200)에서 시작해 dx, dy만큼 움직였을 때 */
const move=(dx:number,dy:number,x0=200)=>({moveX:x0+dx,dx,dy});

describe('판 밀기 방향 판정 (2026-11-05 실기기: 가로로 밀어도 세로 스크롤이 가져감)',()=>{
  it('iOS 세로 스크롤이 잡기 전(8pt 넘게)에 가로를 정한다',()=>{
    expect(isHorizontalSwipe(move(9,2))).toBe(true);
    expect(isHorizontalSwipe(move(-9,0))).toBe(true);
  });
  it('8pt 이하는 아직 누르기로 본다',()=>{
    expect(isHorizontalSwipe(move(8,0))).toBe(false);
  });
  it('세로가 분명하거나 대각선이면 세로 스크롤에 맡긴다',()=>{
    expect(isHorizontalSwipe(move(10,20))).toBe(false);
    expect(isHorizontalSwipe(move(12,10))).toBe(false);
    expect(isHorizontalSwipe(move(13,10))).toBe(true);
  });
  it('화면 왼쪽 끝에서 시작하면 뒤로 가기에 맡긴다',()=>{
    expect(isHorizontalSwipe(move(30,0,10))).toBe(false);
  });
});

function LockButton() {
  const lock=useScrollLock();
  return <>
    <Pressable onPress={()=>lock(true)}><PixelText>잠그기</PixelText></Pressable>
    <Pressable onPress={()=>lock(false)}><PixelText>풀기</PixelText></Pressable>
  </>;
}
describe('판 밀기 동안 바깥 세로 스크롤 멈춤',()=>{
  it('판이 잡으면 RetroScreen 스크롤을 멈추고, 떼면 되돌린다',()=>{
    render(<RetroScreen><LockButton/></RetroScreen>);
    const scroll=screen.getByTestId('retro-scroll');
    const before=getComputedStyle(scroll).overflowY;
    act(()=>{screen.getByText('잠그기').click();});
    expect(getComputedStyle(scroll).overflowY).toBe('hidden');
    act(()=>{screen.getByText('풀기').click();});
    expect(getComputedStyle(scroll).overflowY).toBe(before);
    expect(before).not.toBe('hidden');
  });
});

describe('작은 달력판 날짜 칸 폭 (2026-11-05 실기기: 일부 칸만 오른쪽 테두리가 얇음)',()=>{
  // 소수점 폭(Yoga가 물리 픽셀 단위로 반올림한 값) 예시
  it.each([[300.67,40],[312.33,42],[350,47]])('판 안 폭 %s에서 일곱 칸이 모두 같은 정수 폭(%s)이고 넘치지 않는다',(width,expected)=>{
    const day=compactDayWidth(width);
    expect(day).toBe(expected);
    expect(Number.isInteger(day)).toBe(true);
    expect(day*7+3*6).toBeLessThanOrEqual(width);
  });
});
