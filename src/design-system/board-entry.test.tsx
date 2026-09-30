import React from 'react';
import {afterEach,describe,expect,it} from 'vitest';
import {cleanup,render,screen} from '@testing-library/react';
import {PixelPanel,PixelText,StickerGrid} from './components';
import {centeredScrollOffset} from './composition-controls';
import {BoardDetailScreen} from './board-screens';
afterEach(cleanup);

// 판 상세 재진입 (2026-09-30 실기기 녹화): 첫 프레임에 칸이 2열로 그려지고 테두리가 빠진 채 보였다.
describe('판 상세 첫 프레임',()=>{
  it('판 테두리 안의 칸 너비는 첫 프레임부터 판 안쪽 폭으로 잡아 3열이 된다',()=>{
    // jsdom은 창 폭이 0이다. RN Web의 Dimensions는 documentElement 폭을 읽는다.
    Object.defineProperty(document.documentElement,'clientWidth',{configurable:true,value:390});
    window.dispatchEvent(new Event('resize'));
    render(<PixelPanel><StickerGrid>{[1,2,3].map(n=><PixelText key={n}>{`칸${n}`}</PixelText>)}</StickerGrid></PixelPanel>);
    // 화면 폭 350 - 판 안쪽 여백 2×28 = 294 → (294 - 2×6 - 2×15) / 3 = 84
    expect(getComputedStyle(screen.getByText('칸1').parentElement!).width).toBe('84px');
  });
  it('크기를 재기 전에는 판을 가리고 제목 줄은 바로 보인다',()=>{
    render(<BoardDetailScreen name="10분 독서" sticker="sprout" completed={false} progress={{value:33,total:100,percentLabel:'33%'}}
      board={{kind:'tally',total:100,filled:{},onPress:()=>{},onOpenRecord:()=>{}}} onBack={()=>{}} onSettings={()=>{}}/>);
    expect(getComputedStyle(screen.getByTestId('board-panel')).opacity).toBe('0');
    expect(screen.getByTestId('retro-header').textContent).toContain('내 목표');
  });
});

// 빈칸으로 스크롤해도 목표 이름·진행 줄은 보여야 한다 (2026-09-30 사용자 결정: 판 윗부분 고정).
describe('판 상세 고정 영역',()=>{
  const detail=(board:React.ComponentProps<typeof BoardDetailScreen>['board'])=>render(<BoardDetailScreen name="10분 독서" sticker="sprout" completed={false}
    progress={{value:33,total:100,percentLabel:'33%'}} board={board} onBack={()=>{}} onSettings={()=>{}}/>);
  it('적립판은 칸만 판 안에서 스크롤하고 제목·진행 줄은 스크롤 밖에 둔다',()=>{
    detail({kind:'tally',total:100,filled:{},onPress:()=>{},onOpenRecord:()=>{}});
    const scroll=screen.getByTestId('board-scroll');
    expect(scroll.textContent).toContain('34');
    expect(scroll.textContent).not.toContain('10분 독서');
    expect(scroll.textContent).not.toContain('33%');
    expect(screen.queryByTestId('retro-scroll')).toBeNull();
  });
  it('달력판도 같은 구조다',()=>{
    detail({kind:'calendar',year:2026,month:9,records:{},isDateEnabled:()=>true,canGoPrev:true,canGoNext:true,onSelect:()=>{},onMonthChange:()=>{},onOpenRecord:()=>{}});
    const scroll=screen.getByTestId('board-scroll');
    expect(scroll.textContent).toContain('2026년 9월');
    expect(scroll.textContent).not.toContain('10분 독서');
  });
});

describe('centeredScrollOffset',()=>{
  const viewport={viewportHeight:600,contentHeight:3000};
  it('대상의 가운데를 보이는 영역 가운데에 둔다',()=>{
    expect(centeredScrollOffset({...viewport,targetY:1000,targetHeight:64})).toBe(732);
  });
  it('위쪽 대상은 맨 위에서 멈춘다',()=>{
    expect(centeredScrollOffset({...viewport,targetY:100,targetHeight:64})).toBe(0);
  });
  it('아래쪽 대상은 내용 끝을 넘지 않는다',()=>{
    expect(centeredScrollOffset({...viewport,targetY:2900,targetHeight:64})).toBe(2400);
  });
  it('내용이 보이는 영역보다 짧으면 움직이지 않는다',()=>{
    expect(centeredScrollOffset({viewportHeight:600,contentHeight:400,targetY:300,targetHeight:64})).toBe(0);
  });
});
