import React from 'react';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {BoardDetailScreen} from './board-screens';
import type {TallyBoardView} from './board-screens';

// 붙인 칸은 크기 48의 스티커 그림을 그린다(2026-10-08 44 → 48). 그 그림이 몇 번 그려지는지 세어 칸이 다시 그려졌는지 본다.
const cellDraws=vi.hoisted(()=>({count:0}));
vi.mock('../stickers/pocket/StickerArtwork',()=>({
  StickerArtwork:({size}:{size:number})=>{if(size===48) cellDraws.count++;return null;},
}));
afterEach(cleanup);
beforeEach(()=>{cellDraws.count=0;});

function board(total:number,placed:number,over:Partial<TallyBoardView>={}):TallyBoardView {
  const filled:Record<number,'shoe'>={};
  for (let n=1;n<=placed;n++) filled[n]='shoe';
  // 앱처럼 그릴 때마다 새 객체·새 함수를 넘긴다
  return {kind:'tally',total,filled,recorded:new Set(),justPlaced:placed,onPress:()=>{},onOpenRecord:()=>{},...over};
}
const Screen=({b}:{b:TallyBoardView})=><BoardDetailScreen name="물 마시기" sticker="shoe" completed={false}
  progress={{value:Object.keys(b.filled).length,total:b.total,percentLabel:'0%'}} board={b} onBack={()=>{}} onSettings={()=>{}}/>;

describe('적립판 다시 그리기 (2026-10-04 최적화)',()=>{
  it('한 칸을 붙이면 바뀐 칸만 다시 그리고, 이미 붙인 칸은 다시 그리지 않는다',()=>{
    const r=render(<Screen b={board(100,40)}/>);
    expect(cellDraws.count).toBeGreaterThanOrEqual(40);
    cellDraws.count=0;
    r.rerender(<Screen b={board(100,41)}/>);
    // 새로 붙인 41번 칸과 모션이 끝난 40번 칸 정도만 — 이미 붙인 나머지 칸은 그대로
    expect(cellDraws.count).toBeLessThanOrEqual(3);
  });
  it('그릴 때마다 함수가 바뀌어도 칸을 누르면 가장 최근 함수가 칸 번호와 함께 불린다',()=>{
    const first=vi.fn(),latest=vi.fn();
    const r=render(<Screen b={board(10,3,{onPress:first})}/>);
    r.rerender(<Screen b={board(10,3,{onPress:latest})}/>);
    fireEvent.click(screen.getByRole('button',{name:/^4번 칸/}));
    expect(latest).toHaveBeenCalledWith(4);
    expect(first).not.toHaveBeenCalled();
  });
  it('붙인 칸을 누르면 가장 최근 기록 열기 함수가 칸 번호와 함께 불린다',()=>{
    const first=vi.fn(),latest=vi.fn();
    const r=render(<Screen b={board(10,3,{onOpenRecord:first})}/>);
    r.rerender(<Screen b={board(10,3,{onOpenRecord:latest})}/>);
    const cell=screen.getByRole('button',{name:/^2번 칸/});
    fireEvent.click(cell);
    expect(latest).toHaveBeenCalledWith(2);
    expect(first).not.toHaveBeenCalled();
  });
});

describe('완성한 판 고치기 (2026-10-08)',()=>{
  const Done=({b}:{b:TallyBoardView})=><BoardDetailScreen name="물 마시기" sticker="shoe" completed
    progress={{value:Object.keys(b.filled).length,total:b.total,percentLabel:'90%'}} board={b} onBack={()=>{}} onSettings={()=>{}}/>;
  it('완성한 판도 빈칸을 눌러 붙인다',()=>{
    const press=vi.fn();
    render(<Done b={board(10,9,{onPress:press})}/>);
    fireEvent.click(screen.getByRole('button',{name:/^10번 칸/}));
    expect(press).toHaveBeenCalledWith(10);
  });
});
