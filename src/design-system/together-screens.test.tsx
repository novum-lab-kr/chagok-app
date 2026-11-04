import React from 'react';
import {afterEach,beforeEach,describe,expect,it} from 'vitest';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {PixelFrame,PixelText} from './components';
import {BoardDetailScreen,type TallyBoardView} from './board-screens';
import {BlockPickSheet,BlockedPeopleScreen,FriendBoardList,FriendBoardStrip,InviteProblemScreen,MemberBadgeRow,MemberList,TogetherSettingsScreen,togetherDialogs,type FriendBoard} from './together-screens';
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

describe('함께 목표 설정 (PRD 4.15)',()=>{
  const noop=()=>{};
  const base={mode:'each' as const,goalName:'만 보 걷기',ownerName:'은주',myName:'소라',onChangeMyName:noop,sticker:'basic.sprout' as const,onChooseSticker:noop,onSave:noop,onReport:noop,onBlock:noop,onLeave:noop,onBack:noop};
  it('onRotate가 있으면 [초대 링크 새로 만들기]가 [친구 초대하기] 아래에 있고 누르면 부른다',()=>{
    const rotated:number[]=[];
    render(<MemberList max={6} onInvite={noop} onRotate={()=>rotated.push(1)} members={[{id:'me',name:'은주',sticker:'basic.shoe',me:true,owner:true}]}/>);
    const labels=screen.getAllByRole('button').map(b=>b.textContent);
    expect(labels.indexOf('친구 초대하기')).toBeLessThan(labels.indexOf('초대 링크 새로 만들기'));
    fireEvent.click(screen.getByRole('button',{name:'초대 링크 새로 만들기'}));
    expect(rotated).toEqual([1]);
  });
  it('onRotate가 없으면(함께하는 사람) 버튼이 없다',()=>{
    render(<MemberList max={6} members={[{id:'me',name:'소라',sticker:'basic.sprout',me:true}]}/>);
    expect(screen.queryByText('초대 링크 새로 만들기')).toBeNull();
    expect(screen.queryByText('친구 초대하기')).toBeNull();
  });
  it('만든 사람: slots가 있으면 칸 수 칸, 없으면 없다',()=>{
    const {rerender}=render(<TogetherSettingsScreen {...base} role="owner" onChangeGoalName={noop} onDelete={noop} slots={{current:30,value:'30',onChange:noop}}/>);
    expect(screen.getByText('지금 30칸이에요. 칸은 늘리기만 할 수 있어요.')).toBeTruthy();
    expect(screen.getByLabelText('목표 이름')).toBeTruthy();
    rerender(<TogetherSettingsScreen {...base} role="owner" onChangeGoalName={noop} onDelete={noop}/>);
    expect(screen.queryByText(/지금 30칸/)).toBeNull();
  });
  it('함께하는 사람(member) 화면에는 이름 칸, 칸 수, 삭제하기가 없고 만든 사람이 바꾼다는 안내가 있다',()=>{
    render(<TogetherSettingsScreen {...base} role="member" slots={{current:30,value:'30',onChange:noop}} onDelete={noop}/>);
    expect(screen.queryByLabelText('목표 이름')).toBeNull();
    expect(screen.queryByText(/지금 30칸/)).toBeNull();
    expect(screen.queryByText('삭제하기')).toBeNull();
    expect(screen.getByText('목표 이름과 칸 수는 만든 사람(은주)이 바꿔요.')).toBeTruthy();
    expect(screen.getByText('이 목표에서 나가기')).toBeTruthy();
  });
  it('완성한 판(만든 사람에게 이름 칸을 넘기지 않음)은 이름 칸도 안내도 없다',()=>{
    render(<TogetherSettingsScreen {...base} role="owner" onDelete={noop}/>);
    expect(screen.queryByLabelText('목표 이름')).toBeNull();
    expect(screen.queryByText(/만든 사람\(은주\)/)).toBeNull();
    expect(screen.getByText('불쾌한 이름 신고하기')).toBeTruthy();
  });
});

describe('고르기 시트 (차단, 신고)',()=>{
  const people=[{id:'j',name:'지우',sticker:'basic.flower' as const}];
  it('기본은 「누구를 차단할까요」와 사람',()=>{
    render(<BlockPickSheet visible people={people} onPick={()=>{}} onRequestClose={()=>{}}/>);
    expect(screen.getByText('누구를 차단할까요')).toBeTruthy();
    expect(screen.getByRole('button',{name:'지우'})).toBeTruthy();
  });
  it('신고: title을 바꾸고 extraRows가 사람보다 위에 있다',()=>{
    const picked:string[]=[];
    render(<BlockPickSheet visible title="무엇을 신고할까요" extraRows={[{id:'goal',label:'목표 이름'}]} people={people} onPick={id=>picked.push(id)} onRequestClose={()=>{}}/>);
    expect(screen.getByText('무엇을 신고할까요')).toBeTruthy();
    expect(screen.queryByText('누구를 차단할까요')).toBeNull();
    const labels=screen.getAllByRole('button').map(b=>b.getAttribute('aria-label'));
    expect(labels.indexOf('목표 이름')).toBeLessThan(labels.indexOf('지우'));
    fireEvent.click(screen.getByRole('button',{name:'목표 이름'}));
    expect(picked).toEqual(['goal']);
  });
  it('고를 사람이 없으면 [닫기]만',()=>{
    render(<BlockPickSheet visible people={[]} onPick={()=>{}} onRequestClose={()=>{}}/>);
    expect(screen.getAllByRole('button').map(b=>b.textContent)).toEqual(['닫기']);
  });
});

describe('차단한 사람 (앱 설정)',()=>{
  it('sticker와 goalName이 없어도 이름과 [풀기]가 보이고, [풀기] 접근성 이름은 「지우님 차단 풀기」',()=>{
    const released:string[]=[];
    render(<BlockedPeopleScreen people={[{id:'j',name:'지우'}]} onUnblock={id=>released.push(id)} onBack={()=>{}}/>);
    expect(screen.getByText('지우')).toBeTruthy();
    expect(document.body.textContent).not.toContain('에서 차단');
    fireEvent.click(screen.getByRole('button',{name:'지우님 차단 풀기'}));
    expect(released).toEqual(['j']);
  });
  it('이름이 없으면 이름을 지어내지 않고 [풀기] 접근성 이름은 「풀기」',()=>{
    render(<BlockedPeopleScreen people={[{id:'x',name:null}]} onUnblock={()=>{}} onBack={()=>{}}/>);
    expect(screen.getByRole('button',{name:'풀기'})).toBeTruthy();
  });
});

describe('목표 설정 창 문구',()=>{
  it('지우거나 내보내는 일은 [취소]가 있는 확인 창',()=>{
    for(const spec of [togetherDialogs.leave('each'),togetherDialogs.kick('지우'),togetherDialogs.rotate,togetherDialogs.report('목표 이름')]) {
      expect(spec.secondaryLabel).toBe('취소');
    }
    expect(togetherDialogs.leave('one').description).toBe('판에 붙인 내 스티커가 떨어지고, 이 목표가 내 목록에서 사라져요.');
    expect(togetherDialogs.kick('지우').title).toBe('지우님을 내보낼까요?');
    expect(togetherDialogs.report('지우님의 이름').title).toBe('지우님의 이름을 신고할까요?');
  });
  it('결과와 실패 창은 [확인] 하나',()=>{
    for(const spec of [togetherDialogs.reportDone,togetherDialogs.gone,togetherDialogs.ownerOnly,togetherDialogs.failed('나가지 못했어요','인터넷 연결을 확인하고 다시 시도해 주세요.')]) {
      expect(spec.primaryLabel).toBe('확인');
      expect(spec).not.toHaveProperty('secondaryLabel');
    }
  });
});
