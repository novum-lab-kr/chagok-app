import React from 'react';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {act,cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {Keyboard} from 'react-native';
import {PixelFrame,PixelText,SCREEN_PADDING} from './components';
import {BoardDetailScreen,type TallyBoardView} from './board-screens';
import {BlockPickSheet,BlockedPeopleScreen,FriendBoardList,FriendBoardStrip,InviteProblemScreen,MemberBadgeRow,MemberList,OneBoardMembers,OneBoardWaiting,TogetherGoalScreen,TogetherSettingsScreen,deleteOwnerDescription,togetherDialogs,type FriendBoard} from './together-screens';
import {SlotsField} from './board-screens';
import {t} from '../i18n';
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
  it('%를 쓰지 않고 이름 아래에 붙인 칸/전체 칸을 쓴다',()=>{
    render(<FriendBoardStrip name="지우" sticker="basic.flower" board={tally(18)}/>);
    expect(document.body.textContent).not.toMatch(/%/);
    expect(screen.getByText('18/30')).toBeTruthy();
    expect(screen.getByLabelText('지우의 판, 30칸 중 18칸')).toBeTruthy();
    expect(screen.queryByText('완성')).toBeNull();
  });
  it('판 칸 수보다 뒤 자리는 그리지 않고 마지막 칸이 30이다 (붙인 칸 1~30)',()=>{
    for(let filled=1;filled<=30;filled++){
      render(<FriendBoardStrip name="지우" sticker="basic.flower" board={tally(filled)}/>);
      const cells=screen.getByTestId('friend-strip-cells');
      // 7칸 두 줄 = 14자리 모두 판 칸(테두리 있음)
      expect(cells.children).toHaveLength(14);
      const first=Math.min(Math.max(1,(Math.ceil(filled/7)-2)*7+1),17);
      // 보이는 칸은 first~first+13이고 그 안의 붙은 칸 수만큼 스티커
      expect(stickersIn(cells)).toBe(Math.max(0,filled-first+1));
      // 판 밖(31칸 이후)은 없고, 가장 최근 칸은 늘 보인다. 29칸부터는 마지막 칸 30이 창 끝이다
      expect(first+13).toBeLessThanOrEqual(30);
      expect(filled).toBeGreaterThanOrEqual(first);
      if(filled>=29) expect(first+13).toBe(30);
      cleanup();
    }
  });
  it('다 채운 30칸 판은 22~30이 아니라 17~30칸 14장을 다 보여 주고 [완성]',()=>{
    render(<FriendBoardStrip name="지우" sticker="basic.flower" board={tally(30)}/>);
    expect(stickersIn(screen.getByTestId('friend-strip-cells'))).toBe(14);
    expect(screen.getByText('완성')).toBeTruthy();
    expect(screen.queryByText('30/30')).toBeNull();
    expect(screen.getByLabelText('지우의 판, 30칸 중 30칸, 완성')).toBeTruthy();
  });
  it('칸 수가 두 줄보다 적으면 칸 수만큼만 그린다',()=>{
    render(<FriendBoardStrip name="지우" sticker="basic.flower" board={tally(5,10)}/>);
    const cells=screen.getByTestId('friend-strip-cells');
    expect(cells.children).toHaveLength(10);
    expect(stickersIn(cells)).toBe(5);
    expect(screen.getByText('5/10')).toBeTruthy();
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
    // 목표 설정의 n/6과 같이 나를 포함한 수
    expect(screen.getByText('함께하는 사람 2')).toBeTruthy();
    fireEvent.click(screen.getByLabelText('지우의 판, 30칸 중 3칸'));
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
  it('한 판 기다림 안내(A안)는 같은 카드에 둘째 줄만 한 판 문구이고, 판 패널 위에 놓인다',()=>{
    let resent=0;
    render(<BoardDetailScreen name="우리 판" sticker="shoe" completed={false} progress={{value:0,total:12,percentLabel:''}}
      board={{kind:'tally',total:12,filled:{},onPress:()=>{},onOpenRecord:()=>{}}} hideProgress boardRows={4}
      above={<OneBoardWaiting onResend={()=>{resent++;}}/>} onBack={()=>{}} onSettings={()=>{}}/>);
    const title=screen.getByText('친구를 기다리고 있어요');
    expect(screen.getByText('친구가 들어오면 이 판에 같이 붙여요.')).toBeTruthy();
    expect(screen.queryByText('들어오면 친구 판이 여기에 모여요.')).toBeNull();
    expect(title.compareDocumentPosition(screen.getByTestId('board-panel'))&Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    fireEvent.click(screen.getByRole('button',{name:'링크 다시 보내기'}));
    expect(resent).toBe(1);
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
  it('한 판 아래는 함께하는 사람 n(나 포함)과 사람마다 붙인 칸 수, 누를 수 없다 (2026-11-06)',()=>{
    render(<OneBoardMembers members={[{id:'u-owner',name:'은주',sticker:'basic.shoe',placed:12},{id:'me',name:'소라',sticker:'basic.sprout',me:true,placed:0}]}/>);
    expect(screen.getByText('함께하는 사람 2')).toBeTruthy();
    expect(screen.getByLabelText('은주, 12칸')).toBeTruthy();
    expect(screen.getByLabelText('소라(나), 0칸')).toBeTruthy();
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });
});

describe('함께 목표 설정 (PRD 4.15)',()=>{
  const noop=()=>{};
  const base={mode:'each' as const,goalName:'만 보 걷기',ownerName:'은주',boardLabel:'적립판 30칸',myName:'소라',onChangeMyName:noop,sticker:'basic.sprout' as const,onChooseSticker:noop,onSave:noop,onReport:noop,onBlock:noop,onLeave:noop,onBack:noop};
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
  it('만든 사람 이름이 없으면(차단해 기기에 없음) 빈 괄호 대신 이름 없는 안내',()=>{
    render(<TogetherSettingsScreen {...base} role="member" ownerName=""/>);
    expect(screen.getByText('만든 사람만 바꿀 수 있어요.')).toBeTruthy();
    expect(document.body.textContent).not.toContain('()');
  });
  it('onReport와 onBlock이 없으면(다른 사람이 없음) [불쾌한 이름 신고하기]와 [사람 차단하기] 줄이 없다',()=>{
    render(<TogetherSettingsScreen {...base} role="owner" onDelete={noop} onReport={undefined} onBlock={undefined}/>);
    expect(screen.queryByText('불쾌한 이름 신고하기')).toBeNull();
    expect(screen.queryByText('사람 차단하기')).toBeNull();
    expect(screen.getByText('이 목표에서 나가기')).toBeTruthy();
  });
  it('saveError는 화면 읽기에 알림으로 한 번만 읽힌다(칸 아래 문구가 알림이라 버튼 위 문구는 알림이 아니다)',()=>{
    const msg='이 목표에서 이미 누가 쓰는 스티커예요.';
    render(<TogetherSettingsScreen {...base} role="member" stickerError={msg} saveError={msg}/>);
    expect(screen.getAllByText(msg)).toHaveLength(2);
    expect(screen.getAllByRole('alert').filter((el)=>el.textContent===msg)).toHaveLength(1);
  });
  it('saveError는 [저장하기] 바로 위에 보인다(위쪽 칸의 오류가 화면 밖이어도)',()=>{
    render(<TogetherSettingsScreen {...base} role="member" stickerError="이 목표에서 이미 누가 쓰는 스티커예요." saveError="이 목표에서 이미 누가 쓰는 스티커예요."/>);
    const msg='이 목표에서 이미 누가 쓰는 스티커예요.';
    const text=document.body.textContent??'';
    const save=text.indexOf(t('goal.save'));
    expect(text.slice(save-msg.length,save)).toBe(msg);
  });
  it('삭제 확인 창 문구는 방식마다 다르다: 한 판은 내가 붙인 칸이 지워지고 친구들이 붙인 칸은 그대로',()=>{
    expect(deleteOwnerDescription('each')).toBe('내 판과 기록이 지워지고 이 목표에서 나가요. 친구들의 판은 그대로예요.');
    expect(deleteOwnerDescription('one')).toBe(t('together.deleteOwnerOne'));
  });
  it('확인 창에 있는 설명은 화면에 다시 두지 않는다: 신고, 차단, 나가기, 삭제 줄 아래 설명이 없다 (2026-11-05 사용자)',()=>{
    for(const mode of ['each','one'] as const){
      render(<TogetherSettingsScreen {...base} mode={mode} role="owner" onChangeGoalName={noop} onDelete={noop} onReport={noop} onBlock={noop}/>);
      expect(screen.getByText('불쾌한 이름 신고하기')).toBeTruthy();
      expect(screen.getByText('사람 차단하기')).toBeTruthy();
      expect(screen.getByText('이 목표에서 나가기')).toBeTruthy();
      for(const text of [deleteOwnerDescription(mode),t('together.leaveHintEach'),t('together.leaveHintOne'),t('block.confirmDescription','지우')]) expect(screen.queryByText(text)).toBeNull();
      expect(screen.queryByText(/상대에게는 알리지 않아요|다른 사람에게는 보이지 않아요/)).toBeNull();
      cleanup();
    }
  });
  it('함께하는 사람의 목표 칸은 판 종류 줄 아래 만든 사람이 바꾼다는 안내',()=>{
    render(<TogetherSettingsScreen {...base} role="member"/>);
    const text=document.body.textContent??'';
    expect(screen.getByText('적립판 30칸')).toBeTruthy();
    expect(text.indexOf('적립판 30칸')).toBeLessThan(text.indexOf('목표 이름과 칸 수는 만든 사람(은주)이 바꿔요.'));
  });
  it('완성한 판은 함께하는 사람에게 판 종류와 완성한 날을 보이고 바꾼다는 안내가 없다 (2026-11-06 비어 보임)',()=>{
    render(<TogetherSettingsScreen {...base} role="member" completedLabel="11월 6일"/>);
    expect(screen.getByText('만 보 걷기')).toBeTruthy();
    expect(screen.getByText('적립판 30칸')).toBeTruthy();
    expect(screen.getByText('11월 6일 완성')).toBeTruthy();
    expect(screen.queryByText(/바꿔요|바꿀 수 있어요/)).toBeNull();
  });
  it('달력판은 판 종류와 기간',()=>{
    render(<TogetherSettingsScreen {...base} role="member" boardLabel="달력판" periodLabel="9월 1일부터"/>);
    expect(screen.getByText('달력판')).toBeTruthy();
    expect(screen.getByText('9월 1일부터')).toBeTruthy();
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
  it('이름과 [풀기]만 보이고, [풀기] 접근성 이름은 「지우님 차단 풀기」',()=>{
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
    expect(togetherDialogs.report('목표 이름').description).toBe('신고 내용을 확인하고 필요하면 이름을 지우거나 내보내요. 신고한 것은 다른 사람에게 보이지 않아요.');
    expect(togetherDialogs.reportDone.description).toBe('알려 주셔서 고마워요. 신고 내용을 꼼꼼히 확인해 볼게요.');
  });
  it('결과와 실패 창은 [확인] 하나',()=>{
    for(const spec of [togetherDialogs.reportDone,togetherDialogs.gone,togetherDialogs.ownerOnly,togetherDialogs.failed('나가지 못했어요','인터넷 연결을 확인하고 다시 시도해 주세요.')]) {
      expect(spec.primaryLabel).toBe('확인');
      expect(spec).not.toHaveProperty('secondaryLabel');
    }
  });
});

describe('칸 수 직접 입력 상한 (함께 목표 1000칸)',()=>{
  const noop=()=>{};
  /** 직접 입력으로 바꾼 뒤 입력칸 */
  function customInput() {
    fireEvent.click(screen.getByRole('button',{name:'직접 입력'}));
    return screen.getByLabelText('칸 수 직접 입력',{selector:'input'}) as HTMLInputElement;
  }
  it('max=1000이면 1000과 1001을 칠 수 있고, 1001이면 넘긴 상한 문구를 보인다',()=>{
    const typed:string[]=[];
    const {rerender}=render(<SlotsField current={30} value="30" onChange={v=>typed.push(v)} max={1000}/>);
    const input=customInput();
    expect(input.maxLength).toBe(5);
    fireEvent.change(input,{target:{value:'1000'}});
    fireEvent.change(input,{target:{value:'1001'}});
    expect(typed).toEqual(['1000','1001']);
    rerender(<SlotsField current={30} value="1001" onChange={noop} max={1000} error={t('validation.slotCountMax',1000)}/>);
    expect(screen.getByText('1000칸까지 만들 수 있어요.')).toBeTruthy();
  });
  it('max가 없으면(혼자 목표) 지금 그대로 세 자리',()=>{
    render(<SlotsField current={30} value="30" onChange={noop}/>);
    expect(customInput().maxLength).toBe(3);
  });
  it('친구와 함께 만들기도 countMax를 넘기면 네 자리 넘게 칠 수 있다',()=>{
    render(<TogetherGoalScreen mode="each" onChangeMode={noop} name="걷기" onChangeName={noop} kind="tally" onChangeKind={noop} count="15" onChangeCount={noop} countMax={1000}
      myName="은주" onChangeMyName={noop} sticker="basic.shoe" onChooseSticker={noop} maxFriends={5} onSubmit={noop} onBack={noop}/>);
    expect(customInput().maxLength).toBe(5);
  });
  it('친구와 함께 만들기의 칸 수 오류는 칸 수 칸 바로 아래(내 이름 위)에 보인다',()=>{
    render(<TogetherGoalScreen mode="each" onChangeMode={noop} name="걷기" onChangeName={noop} kind="tally" onChangeKind={noop} count="1001" onChangeCount={noop} countMax={1000}
      countError="1000칸까지 만들 수 있어요." myName="은주" onChangeMyName={noop} sticker="basic.shoe" onChooseSticker={noop} maxFriends={5} onSubmit={noop} onBack={noop}/>);
    const text=document.body.textContent??'';
    expect(text.indexOf('1000칸까지 만들 수 있어요.')).toBeGreaterThan(text.indexOf('직접 입력'));
    expect(text.indexOf('1000칸까지 만들 수 있어요.')).toBeLessThan(text.indexOf('내 이름'));
    expect(screen.getAllByText('1000칸까지 만들 수 있어요.')).toHaveLength(1);
  });
  it('친구와 함께 만들기에서 버튼 위 문구는 알림이 아니다(칸 아래 문구와 두 번 읽히지 않게)',()=>{
    const msg='쓸 수 없는 낱말이 있어요.';
    render(<TogetherGoalScreen mode="each" onChangeMode={noop} name="걷기" onChangeName={noop} nameError={msg} kind="tally" onChangeKind={noop} count="15" onChangeCount={noop}
      myName="은주" onChangeMyName={noop} sticker="basic.shoe" onChooseSticker={noop} maxFriends={5} error={msg} onSubmit={noop} onBack={noop}/>);
    expect(screen.getAllByText(msg)).toHaveLength(2);
    expect(screen.getAllByRole('alert').filter((el)=>el.textContent===msg)).toHaveLength(1);
  });
  describe('칸 수 오류와 키보드',()=>{
    const props={mode:'each' as const,onChangeMode:noop,name:'걷기',onChangeName:noop,kind:'tally' as const,onChangeKind:noop,count:'1001',onChangeCount:noop,countMax:1000,
      myName:'은주',onChangeMyName:noop,sticker:'basic.shoe' as const,onChooseSticker:noop,maxFriends:5,onSubmit:noop,onBack:noop};
    const msg='1000칸까지 만들 수 있어요.';
    let showKeyboard:((event:{endCoordinates:{screenY:number}})=>void)|undefined;
    let scroll:ReturnType<typeof vi.fn>;
    beforeEach(()=>{
      showKeyboard=undefined;
      vi.spyOn(Keyboard,'addListener').mockImplementation(((name:string,fn:never)=>{if(name==='keyboardDidShow') showKeyboard=fn;return {remove:noop};}) as never);
      scroll=vi.fn();
      (Element.prototype as unknown as {scroll:unknown}).scroll=scroll;
      // 칸 수 묶음(입력칸과 오류)이 화면 위 380에서 60 높이, 키보드 위 끝은 400
      vi.spyOn(Element.prototype,'getBoundingClientRect').mockReturnValue({top:380,left:0,width:300,height:60,bottom:440,right:300,x:0,y:380,toJSON:noop} as DOMRect);
    });
    afterEach(()=>{vi.restoreAllMocks();delete (Element.prototype as unknown as {scroll?:unknown}).scroll;});
    it('키보드가 떠 있을 때 칸 수 오류가 나타나면 문구 아래 끝이 키보드 위로 오게 내린다',async()=>{
      const {rerender}=render(<TogetherGoalScreen {...props}/>);
      act(()=>showKeyboard!({endCoordinates:{screenY:400}}));
      rerender(<TogetherGoalScreen {...props} countError={msg}/>);
      await waitFor(()=>expect(scroll).toHaveBeenCalled());
      expect(scroll.mock.calls.at(-1)![0]).toMatchObject({top:380+60+SCREEN_PADDING-400});
    });
    it('키보드가 없으면 오류가 나타나도 옮기지 않는다',async()=>{
      const {rerender}=render(<TogetherGoalScreen {...props}/>);
      rerender(<TogetherGoalScreen {...props} countError={msg}/>);
      await new Promise((resolve)=>setTimeout(resolve,10));
      expect(scroll).not.toHaveBeenCalled();
    });
  });
});
