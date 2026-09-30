import React from 'react';
import {afterEach,describe,expect,it} from 'vitest';
import {cleanup,render,screen} from '@testing-library/react';
import {SafeAreaInsetsContext} from 'react-native-safe-area-context';
import {RetroScreen} from './composition-controls';
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
  it('header가 없으면 스크롤 밖 헤더 자리를 만들지 않는다',()=>{
    render(<RetroScreen><PixelText>본문</PixelText></RetroScreen>);
    expect(screen.queryByTestId('retro-header')).toBeNull();
  });
});
