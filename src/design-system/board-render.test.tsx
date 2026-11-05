import React from 'react';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {BoardDetailScreen,SECOND_OFFSET} from './board-screens';
import {retro} from './tokens';
import type {CalendarBoardView,TallyBoardView} from './board-screens';

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

describe('혼자 적립판은 한 줄 3칸, 함께 목표 작은 판만 4칸이나 5칸 (2026-11-05)',()=>{
  // jsdom은 창 폭이 0이다. RN Web의 Dimensions는 documentElement 폭을 읽는다.
  const phone=(width:number)=>{
    Object.defineProperty(document.documentElement,'clientWidth',{configurable:true,value:width});
    window.dispatchEvent(new Event('resize'));
  };
  afterEach(()=>phone(0));
  // 칸을 감싼 것 가운데 폭을 숫자로 정한 첫 상자가 칸 자리다.
  const cellSize=()=>{
    let node:HTMLElement|null=screen.getByRole('button',{name:/^1번 칸/});
    while(node&&!getComputedStyle(node).width.endsWith('px')) node=node.parentElement;
    return node&&[getComputedStyle(node).width,getComputedStyle(node).height];
  };
  it('390 폭 혼자 적립판: 판 안 294, 한 줄 3칸 84:64',()=>{
    phone(390);
    render(<Screen b={board(15,0)}/>);
    expect(cellSize()).toEqual(['84px','64px']);
  });
  it('440 폭 혼자 적립판도 한 줄 3칸: 판 안 344 → 100:76',()=>{
    phone(440);
    render(<Screen b={board(15,0)}/>);
    expect(cellSize()).toEqual(['100px','76px']);
  });
  it('430 폭 함께 목표 작은 판(boardRows=2)은 한 줄 5칸',()=>{
    phone(430);
    // 다음 빈칸 12가 든 쪽이 5칸 두 줄이면 11~20칸
    render(<BoardDetailScreen name="내 판" sticker="shoe" completed={false} progress={{value:11,total:30,percentLabel:'36%'}} board={board(30,11)}
      hideProgress boardRows={2} onBack={()=>{}} onSettings={()=>{}}/>);
    expect(screen.getByText('11~20칸 / 30')).toBeTruthy();
  });
});

describe('한 판 가려진 칸 (PRD 4.15, 차단)',()=>{
  const Small=({b}:{b:TallyBoardView})=><BoardDetailScreen name="우리 판" sticker="shoe" completed={false} progress={{value:0,total:b.total,percentLabel:''}} board={b}
    hideProgress boardRows={4} onBack={()=>{}} onSettings={()=>{}}/>;
  it('hidden 칸은 누를 수 없고 「가려진 칸」으로 읽힌다',()=>{
    const pressed:number[]=[];
    render(<Small b={board(12,2,{hidden:new Set([3]),justPlaced:undefined,onPress:n=>pressed.push(n)})}/>);
    const hidden=screen.getByLabelText('가려진 칸');
    expect(hidden.querySelector('button, [role="button"]')).toBeNull();
    fireEvent.click(hidden);
    expect(pressed).toEqual([]);
    expect(screen.getByRole('button',{name:/^4번 칸/})).toBeTruthy();
    expect(screen.queryByRole('button',{name:/^3번 칸/})).toBeNull();
  });
  it('hidden이 없으면 그 칸은 지금처럼 빈칸이다',()=>{
    render(<Small b={board(12,2,{justPlaced:undefined})}/>);
    expect(screen.queryByLabelText('가려진 칸')).toBeNull();
    expect(screen.getByRole('button',{name:/^3번 칸/})).toBeTruthy();
  });
});

describe('한 판 달력판 하루 두 장 (2026-11-05 시안 T2 B안)',()=>{
  const cal=(records2?:Record<string,'shoe'|'star'>)=>({kind:'calendar' as const,year:2026,month:9,records:{'2026-09-22':'shoe' as const,'2026-09-23':'star' as const},records2,
    selectedDate:'2026-09-29',isDateEnabled:()=>true,canGoPrev:true,canGoNext:false,onSelect:()=>{},onMonthChange:()=>{},onOpenRecord:()=>{}});
  const Small=({b}:{b:CalendarBoardView})=><BoardDetailScreen name="우리 판" sticker="shoe" completed={false} progress={{value:0,total:0,percentLabel:''}} board={b}
    hideProgress boardRows={2} onBack={()=>{}} onSettings={()=>{}}/>;
  it('둘째 장이 있는 날은 두 장을 겹쳐 그리고, 두 사람이 붙인 날로 읽힌다',()=>{
    render(<Small b={cal({'2026-09-22':'star'})}/>);
    const two=screen.getByRole('button',{name:/^9월 22일/});
    expect(two.getAttribute('aria-label')).toContain('두 사람이 붙였어요');
    expect(two.querySelector('[data-testid="day-second-sticker"]')).not.toBeNull();
    const one=screen.getByRole('button',{name:/^9월 23일/});
    expect(one.getAttribute('aria-label')).not.toContain('두 사람');
    expect(one.querySelector('[data-testid="day-second-sticker"]')).toBeNull();
  });
  it('친구 것만 있고 한 번 누르면 붙는 날(placeable)은 화면 읽기가 누르면 붙는다고 알린다',()=>{
    render(<Small b={{...cal(),placeable:new Set(['2026-09-23'])}}/>);
    expect(screen.getByRole('button',{name:/^9월 23일/}).getAttribute('aria-label')).toContain('누르면 내 스티커를 붙여요');
    expect(screen.getByRole('button',{name:/^9월 22일/}).getAttribute('aria-label')).not.toContain('누르면');
  });
});

describe('한 판 달력판 하루 두 장은 오늘 꺾쇠 안쪽에 든다 (2026-11-05 QA)',()=>{
  // 정적 Storybook에서 잰 오늘 칸: 402pt 폰 41.1x52, 440pt 폰 46.6x52. 스티커 묶음 위쪽은 칸 위에서 18(날짜 숫자 아래).
  const GLYPH=24,TOP=18,H=52;
  // PixelFocusRing(cornersOnly)의 모서리 L자: 팔 길이 arm, 두께 thickness
  const corner=(w:number)=>{const f=retro.focus;const arm=Math.min(f.cornerSize,Math.floor(Math.min(w,H)/3));return {arm,thickness:Math.min(f.cornerThickness,Math.floor(arm/2)+1)};};
  /** 칸 안 상자가 네 모서리 L자 어느 것과도 겹치지 않는가 */
  const clear=(w:number,box:{x:number;y:number;w:number;h:number})=>{
    const {arm,thickness:t}=corner(w);
    const rects=[[0,0,arm,t],[0,0,t,arm]].flatMap(([x,y,rw,rh])=>[[x,y,rw,rh],[w-x-rw,y,rw,rh],[x,H-y-rh,rw,rh],[w-x-rw,H-y-rh,rw,rh]]);
    return rects.every(([x,y,rw,rh])=>box.x+box.w<=x||x+rw<=box.x||box.y+box.h<=y||y+rh<=box.y);
  };
  it.each([41.1,46.6])('날 칸 폭 %s에서 두 장 묶음이 가운데에 놓여 꺾쇠를 가리지 않는다',w=>{
    const gw=GLYPH+SECOND_OFFSET.x,gh=GLYPH+SECOND_OFFSET.y,x=(w-gw)/2;
    expect(clear(w,{x,y:TOP,w:GLYPH,h:GLYPH})).toBe(true);
    expect(clear(w,{x:x+SECOND_OFFSET.x,y:TOP+SECOND_OFFSET.y,w:GLYPH,h:GLYPH})).toBe(true);
    expect(TOP+gh).toBeLessThanOrEqual(H);
  });
  it('둘째 장은 여전히 비껴 보인다',()=>{
    expect(SECOND_OFFSET.x).toBeGreaterThan(0);
    expect(SECOND_OFFSET.y).toBeGreaterThan(0);
  });
});

describe('작은 판 넘기기는 달 넘기기와 같은 모양 (2026-11-05 사용자)',()=>{
  const before=(a:Element,b:Element)=>Boolean(a.compareDocumentPosition(b)&Node.DOCUMENT_POSITION_FOLLOWING);
  it('달력판: [이전] 날짜 범위 [다음] 순서이고, 갈 수 없는 쪽은 자리만 남는다',()=>{
    const board={kind:'calendar' as const,year:2026,month:9,records:{'2026-09-22':'shoe' as const},selectedDate:'2026-09-29',
      isDateEnabled:()=>true,canGoPrev:true,canGoNext:false,onSelect:()=>{},onMonthChange:()=>{},onOpenRecord:()=>{}};
    render(<BoardDetailScreen name="우리 판" sticker="shoe" completed={false} progress={{value:0,total:0,percentLabel:''}} board={board}
      hideProgress boardRows={2} onBack={()=>{}} onSettings={()=>{}}/>);
    const prev=screen.getByRole('button',{name:'이전 주'});
    const range=screen.getByText('9월 20일~10월 3일');
    expect(before(prev,range)).toBe(true);
    expect(screen.queryByRole('button',{name:'다음 주'})).toBeNull(); // 이번 주보다 뒤로는 가지 않는다
    fireEvent.click(prev);
    const next=screen.getByRole('button',{name:'다음 주'});
    expect(before(screen.getByText('9월 6일~19일'),next)).toBe(true);
  });
});
