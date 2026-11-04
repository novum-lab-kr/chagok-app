import React from 'react';
import {afterEach,beforeEach,describe,expect,it} from 'vitest';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {PixelFrame,PixelText} from './components';
import {BoardDetailScreen,type TallyBoardView} from './board-screens';
import {FriendBoardList,FriendBoardStrip,InviteProblemScreen,MemberBadgeRow,MemberList,togetherDialogs,type FriendBoard} from './together-screens';
afterEach(cleanup);

/** jsdom은 창 폭이 0이다. RN Web의 Dimensions는 documentElement 폭을 읽는다(board-entry.test.tsx와 같은 방법). */
function screenWidth(width:number) {
  Object.defineProperty(document.documentElement,'clientWidth',{configurable:true,value:width});
  window.dispatchEvent(new Event('resize'));
}
const upTo=(count:number)=>new Set(Array.from({length:count},(_,i)=>i+1));
const tally=(filled:number,total=30):FriendBoard=>({kind:'tally',total,filled:upTo(filled)});
const stickersIn=(element:Element)=>element.querySelectorAll('svg[width="24"]').length;

describe('얇은 판 프레임 (PixelFrame thin)',()=>{
  it('안쪽 여백 7로 내용을 감싼다',()=>{
    render(<PixelFrame variant="thin"><PixelText>안</PixelText></PixelFrame>);
    expect(getComputedStyle(screen.getByText('안').parentElement!).padding).toBe('7px');
  });
});

describe('친구 판 줄 (PRD 4.15)',()=>{
  beforeEach(()=>screenWidth(390));
  it('390 폭은 7칸 두 줄이고 가장 최근 칸이 둘째 줄에 온다',()=>{
    render(<FriendBoardStrip name="지우" sticker="basic.flower" board={tally(18)}/>);
    const cells=screen.getByTestId('friend-strip-cells');
    // 판 안 폭 350 - 이름 56 - 사이 8 - 여백 14 = 272 → 7칸, 칸 38
    expect(cells.children).toHaveLength(14);
    expect(getComputedStyle(cells).width).toBe(`${38*7}px`);
    // 18칸 붙였으면 8~21칸을 보여 준다: 붙은 칸 8~18 = 11장, 18은 둘째 줄(15~21)
    expect(stickersIn(cells)).toBe(11);
  });
  it('440 폭은 8칸',()=>{
    screenWidth(440);
    render(<FriendBoardStrip name="지우" sticker="basic.flower" board={tally(18)}/>);
    const cells=screen.getByTestId('friend-strip-cells');
    expect(cells.children).toHaveLength(16);
    // 9~24칸: 붙은 칸 9~18 = 10장
    expect(stickersIn(cells)).toBe(10);
  });
  it('칸 수나 %를 쓰지 않는다',()=>{
    render(<FriendBoardStrip name="지우" sticker="basic.flower" board={tally(18)}/>);
    expect(document.body.textContent).not.toMatch(/%|칸/);
  });
  it('달력판은 지난주와 이번 주 14일',()=>{
    render(<FriendBoardStrip name="민" sticker="basic.star" board={{kind:'calendar',today:'2026-11-12',start:'2026-10-01',dates:new Set(['2026-11-02','2026-11-12'])}}/>);
    const cells=screen.getByTestId('friend-strip-cells');
    expect(cells.children).toHaveLength(14);
    expect(stickersIn(cells)).toBe(2);
    expect(cells.textContent?.startsWith('1')).toBe(true);
  });
  it('줄을 누르면 그 친구 판을 연다',()=>{
    const opened:string[]=[];
    render(<FriendBoardList friends={[{id:'jiwoo',name:'지우',sticker:'basic.flower',board:tally(3)}]} onOpen={id=>opened.push(id)} onResend={()=>{}}/>);
    expect(screen.getByText('함께하는 사람 1')).toBeTruthy();
    fireEvent.click(screen.getByLabelText('지우의 판'));
    expect(opened).toEqual(['jiwoo']);
  });
  it('친구가 없으면 기다리는 자리와 [링크 다시 보내기]',()=>{
    let resent=0;
    render(<FriendBoardList friends={[]} onOpen={()=>{}} onResend={()=>{resent++;}}/>);
    expect(screen.getByText('함께하는 사람')).toBeTruthy();
    expect(screen.getByText('친구를 기다리고 있어요')).toBeTruthy();
    fireEvent.click(screen.getByRole('button',{name:'링크 다시 보내기'}));
    expect(resent).toBe(1);
  });
  it('onResend가 없으면(만든 사람이 아니면) [링크 다시 보내기]가 없다',()=>{
    render(<FriendBoardList friends={[]} onOpen={()=>{}}/>);
    expect(screen.getByText('친구를 기다리고 있어요')).toBeTruthy();
    expect(screen.queryByRole('button',{name:'링크 다시 보내기'})).toBeNull();
  });
});

describe('판 상세의 함께 목표 prop',()=>{
  beforeEach(()=>screenWidth(390));
  const board:TallyBoardView={kind:'tally',total:30,filled:Object.fromEntries(Array.from({length:11},(_,i)=>[i+1,'basic.shoe'])),onPress:()=>{},onOpenRecord:()=>{}};
  const base={name:'내 판',sticker:'basic.shoe' as const,completed:false,progress:{value:11,total:30,percentLabel:'36%'},board,onBack:()=>{},onSettings:()=>{}};
  it('새 prop이 없으면 지금 판 상세 그대로: 머리말 「내 목표」, 판 제목 옆 톱니, 진행 막대',()=>{
    render(<BoardDetailScreen {...base}/>);
    expect(screen.getByTestId('retro-header').textContent).toContain('내 목표');
    expect(screen.getByTestId('retro-header').querySelector('[aria-label="목표 설정"]')).toBeNull();
    expect(screen.getByLabelText('목표 설정')).toBeTruthy();
    expect(screen.getByRole('progressbar')).toBeTruthy();
    expect(screen.getByTestId('board-scroll')).toBeTruthy();
  });
  it('boardRows=2: 진행 막대 없이 4칸 두 줄, 다음 빈칸이 든 쪽, 톱니는 머리말로, 아래에 below',()=>{
    render(<BoardDetailScreen {...base} title="11월 만 보 걷기" hideProgress boardRows={2} below={<PixelText>친구 자리</PixelText>}/>);
    expect(screen.getByTestId('retro-header').textContent).toContain('11월 만 보 걷기');
    expect(screen.getByTestId('retro-header').querySelector('[aria-label="목표 설정"]')).not.toBeNull();
    expect(screen.queryByRole('progressbar')).toBeNull();
    expect(screen.getByText('9~16칸 / 30')).toBeTruthy();
    expect(screen.getByText('친구 자리')).toBeTruthy();
    expect(screen.queryByTestId('board-scroll')).toBeNull();
  });
  it('보기만(readOnly)이면 톱니가 없고 칸을 누를 수 없다',()=>{
    let pressed=0;
    render(<BoardDetailScreen {...base} board={{...board,onPress:()=>{pressed++;}}} readOnly hideProgress boardRows={4}/>);
    expect(screen.queryByLabelText('목표 설정')).toBeNull();
    fireEvent.click(screen.getByLabelText('12번 칸, 빈칸'));
    expect(pressed).toBe(0);
  });
});

describe('한 판 사람 줄과 함께하는 사람',()=>{
  it('나는 「나」 배지',()=>{
    render(<MemberBadgeRow people={[{id:'me',name:'은주',sticker:'basic.shoe',me:true},{id:'j',name:'지우',sticker:'basic.flower'}]}/>);
    expect(screen.getByText('나')).toBeTruthy();
    expect(screen.getByText('지우')).toBeTruthy();
  });
  it('만든 사람이 보면 나 말고 모두 내보내기',()=>{
    const kicked:string[]=[];
    render(<MemberList max={6} onKick={id=>kicked.push(id)} members={[{id:'me',name:'은주',sticker:'basic.shoe',me:true,owner:true},{id:'j',name:'지우',sticker:'basic.flower'}]}/>);
    expect(screen.getByText('함께하는 사람 2/6')).toBeTruthy();
    expect(screen.getByText('은주(나)')).toBeTruthy();
    expect(screen.queryByLabelText('은주님 내보내기')).toBeNull();
    fireEvent.click(screen.getByLabelText('지우님 내보내기'));
    expect(kicked).toEqual(['j']);
  });
});

describe('초대 문제',()=>{
  it('들어갈 수 없을 때 차단을 드러내지 않는다',()=>{
    render(<InviteProblemScreen problem="closed" max={6} onHome={()=>{}} onBack={()=>{}}/>);
    expect(screen.getByText('이 목표에는 들어갈 수 없어요')).toBeTruthy();
    expect(document.body.textContent).not.toContain('차단');
  });
});

describe('한 판 창 문구 (판 화면이 띄운다)',()=>{
  it('연결 없음과 이미 누가 붙였어요는 버튼 하나 [확인]',()=>{
    expect(togetherDialogs.offlineOne).toMatchObject({title:'연결되면 붙일 수 있어요',primaryLabel:'확인'});
    expect(togetherDialogs.offlineOne).not.toHaveProperty('secondaryLabel');
    expect(togetherDialogs.slotTaken).toMatchObject({title:'이미 누가 붙였어요',primaryLabel:'확인'});
  });
  it('하루 창: 붙일 수 있으면 [나도 붙이기], 나도 붙였으면 [내 기록 보기], 아니면 [확인]만',()=>{
    expect(togetherDialogs.placedOnDay('지우',['지우 9월 3일 7:00'],'placeToo')).toMatchObject({primaryLabel:'나도 붙이기',secondaryLabel:'닫기'});
    expect(togetherDialogs.placedOnDay('지우, 소라(나)',[],'myRecord')).toMatchObject({primaryLabel:'내 기록 보기',secondaryLabel:'닫기'});
    expect(togetherDialogs.placedOnDay('지우',[],null)).not.toHaveProperty('secondaryLabel');
  });
});
