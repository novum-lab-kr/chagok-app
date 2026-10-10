import React from 'react';
import {afterEach,describe,expect,it} from 'vitest';
import {cleanup,render,screen} from '@testing-library/react';
import {SafeAreaInsetsContext} from 'react-native-safe-area-context';
import {RetroScreen,SheetSafeArea} from './composition-controls';
import {PixelText} from './components';
afterEach(cleanup);

const insets={top:47,bottom:34,left:0,right:0};

describe('RetroScreen 고정 헤더 (2026-09-30)',()=>{
  it('header는 스크롤 영역 밖에 그린다',()=>{
    render(<RetroScreen header={<PixelText>헤더</PixelText>}><PixelText>본문</PixelText></RetroScreen>);
    const scroll=screen.getByTestId('retro-scroll');
    expect(scroll.textContent).toContain('본문');
    expect(scroll.textContent).not.toContain('헤더');
    expect(screen.getByTestId('retro-header').textContent).toContain('헤더');
  });
  it('상태 표시줄 여백은 스크롤 밖에 둬서 스크롤한 내용이 시계 영역에 비치지 않는다',()=>{
    render(<SafeAreaInsetsContext.Provider value={insets}><RetroScreen><PixelText>본문</PixelText></RetroScreen></SafeAreaInsetsContext.Provider>);
    const scroll=screen.getByTestId('retro-scroll');
    const outer=scroll.parentElement!;
    expect(getComputedStyle(outer).paddingTop).toBe('47px');
    expect(scroll.innerHTML).not.toContain('padding-top: 47px');
  });
  it('시트 안에서는 위쪽 여백을 비우지 않는다 (2026-10-10 시트 헤더 위가 휑함)',()=>{
    render(<SafeAreaInsetsContext.Provider value={insets}><SheetSafeArea><RetroScreen><PixelText>본문</PixelText></RetroScreen></SheetSafeArea></SafeAreaInsetsContext.Provider>);
    const scroll=screen.getByTestId('retro-scroll');
    expect(getComputedStyle(scroll.parentElement!).paddingTop).toBe('0px');
    expect(scroll.innerHTML).toContain('padding-bottom: 54px');
  });
  it('제목 줄과 본문 사이는 화면의 gap과 상관없이 24를 띄운다 (2026-10-10 너무 붙어 보임)',()=>{
    render(<RetroScreen style={{gap:14}} header={<PixelText>헤더</PixelText>}><PixelText>본문</PixelText></RetroScreen>);
    expect(getComputedStyle(screen.getByTestId('retro-header')).paddingBottom).toBe('24px');
  });
  it('헤더 아래가 탭이면 headerGap으로 본문 간격만큼 줄인다 (2026-10-10 기본 스티커)',()=>{
    render(<RetroScreen style={{gap:14}} headerGap={14} header={<PixelText>헤더</PixelText>}><PixelText>본문</PixelText></RetroScreen>);
    expect(getComputedStyle(screen.getByTestId('retro-header')).paddingBottom).toBe('14px');
  });
  it('header가 없으면 스크롤 밖 헤더 자리를 만들지 않는다',()=>{
    render(<RetroScreen><PixelText>본문</PixelText></RetroScreen>);
    expect(screen.queryByTestId('retro-header')).toBeNull();
  });
});
