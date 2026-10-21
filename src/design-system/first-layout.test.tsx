import React from 'react';
import { View } from 'react-native';
import { describe,it,expect,afterEach,beforeEach,vi } from 'vitest';
import { render,screen,cleanup } from '@testing-library/react';
import { BoardTypePicker,PixelFocusRing,PixelFrame,RestoreConflictScreen } from './index';

// 새 아키텍처는 기기가 바쁠 때 첫 layout 이벤트를 버린다(2026-10-09). jsdom도 onLayout을 보내지 않으니
// 크기 읽기만 돌려주면 "이벤트가 사라진 경우"와 같다 — 그래도 틀을 그려야 한다.
beforeEach(()=>{
  vi.spyOn(HTMLElement.prototype,'getBoundingClientRect').mockReturnValue({x:0,y:0,top:0,left:0,right:200,bottom:80,width:200,height:80,toJSON:()=>({})} as DOMRect);
});
afterEach(()=>{cleanup();vi.restoreAllMocks();});
const sized=(root:Element)=>root.querySelectorAll('svg[width="200"]').length;

describe('첫 layout 이벤트 없이도 처음 크기로 그린다',()=>{
  it('픽셀 틀',()=>{
    const {container}=render(<PixelFrame/>);
    expect(sized(container)).toBe(1);
  });
  it('포커스 표시',()=>{
    const {container}=render(<View style={{width:200,height:80}}><PixelFocusRing/></View>);
    expect(sized(container)).toBe(1);
  });
  it('판 종류 카드와 미리보기',()=>{
    render(<BoardTypePicker value="tally" onChange={()=>{}}/>);
    // 카드 틀 + 미리보기
    expect(sized(screen.getByRole('radio',{name:'달력판'}))).toBe(2);
  });
  it('복원 충돌 선택 카드',()=>{
    const snap={goals:1,stickers:2,goalNames:['책 읽기'],updatedAt:'9월 27일'};
    render(<RestoreConflictScreen value="server" onChange={()=>{}} onConfirm={()=>{}} onBack={()=>{}} server={snap} device={snap}/>);
    expect(sized(screen.getByRole('radio',{name:'이 기기 기록'}))).toBeGreaterThan(0);
  });
});
