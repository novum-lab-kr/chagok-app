import React from 'react';
import {afterEach,describe,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {CompletionNudge,FloatingTabBar,RecordFeedScreen,RecordTimelineScreen,StickerCollectionScreen,TrialReadyCard,type TimelineDayView} from './tab-screens';
import {colorPack,packRowCount} from './sticker-shop';
afterEach(cleanup);

const tabs=[{key:'goals',label:'목표',icon:'goal'},{key:'records',label:'기록',icon:'record'},{key:'stickers',label:'스티커',icon:'sticker'},{key:'settings',label:'설정',icon:'settings'}] as const;
const days:TimelineDayView[]=[
  {key:'2026-10-12',label:'10월 12일 월요일',entries:[{id:'s1',goalName:'책 읽기',sticker:'basic.sprout',memo:'데미안 3장까지'},{id:'s2',goalName:'물 마시기',sticker:'basic.flower',photo:{uri:'file:///p.jpg'}}]},
  {key:'2026-10-9',label:'10월 9일 금요일',entries:[{id:'s3',goalName:'걷기',sticker:'basic.shoe',memo:'노을'}]},
];

describe('하단 탭 (2026-10-12)',()=>{
  it('고른 탭만 선택 상태이고 다른 탭을 누르면 그 키를 알린다',()=>{
    const change=vi.fn();render(<FloatingTabBar items={tabs} value="goals" onChange={change}/>);
    expect(screen.getByRole('tab',{name:'목표'}).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('tab',{name:'설정'}).getAttribute('aria-selected')).toBe('false');
    fireEvent.click(screen.getByRole('tab',{name:'기록'}));expect(change).toHaveBeenCalledWith('records');
  });
  it('탭 이름은 글자로 보이지 않고 화면 낭독 이름으로만 남는다 (2026-10-15)',()=>{
    render(<FloatingTabBar items={tabs} value="goals" onChange={vi.fn()}/>);
    expect(screen.queryByText('목표')).toBeNull();
    expect(screen.getAllByRole('tab').map(t=>t.getAttribute('aria-label'))).toEqual(['목표','기록','스티커','설정']);
  });
});

describe('기록 탭',()=>{
  it('날짜별로 목표 이름과 메모를 보이고, 누르면 그 칸의 기록을 연다',()=>{
    const open=vi.fn();render(<RecordTimelineScreen days={days} goals={[]} goal={null} onGoal={vi.fn()} onOpen={open}/>);
    expect(screen.getByRole('heading',{name:'10월 12일 월요일'})).toBeTruthy();expect(screen.getByText('데미안 3장까지')).toBeTruthy();
    expect(screen.getByText('사진만 남겼어요')).toBeTruthy();
    fireEvent.click(screen.getByRole('button',{name:/걷기/}));expect(open).toHaveBeenCalledWith('s3');
  });
  it('목표 칩은 [전체]와 목표들이고 누르면 그 목표를 알린다',()=>{
    const pick=vi.fn();render(<RecordTimelineScreen days={days} goals={[{id:'read',name:'책 읽기',sticker:'basic.sprout'}]} goal={null} onGoal={pick} onOpen={vi.fn()}/>);
    expect(screen.getByRole('tab',{name:'전체'}).getAttribute('aria-selected')).toBe('true');
    fireEvent.click(screen.getByRole('tab',{name:'책 읽기'}));expect(pick).toHaveBeenCalledWith('read');
  });
  it('목표 칩은 스티커만 보이고 고른 칩만 이름을 펼친다 (2026-10-17)',()=>{
    const goals=[{id:'read',name:'책 읽기',sticker:'basic.sprout'},{id:'walk',name:'걷기',sticker:'basic.shoe'}] as const;
    const {rerender}=render(<RecordTimelineScreen days={[]} goals={goals} goal={null} onGoal={vi.fn()} onOpen={vi.fn()}/>);
    expect(screen.queryByText('책 읽기')).toBeNull();
    rerender(<RecordTimelineScreen days={[]} goals={goals} goal="read" onGoal={vi.fn()} onOpen={vi.fn()}/>);
    expect(screen.getByText('책 읽기')).toBeTruthy();expect(screen.queryByText('걷기')).toBeNull();
  });
  it('기록이 없으면 남기는 법을 알려 준다',()=>{
    render(<RecordTimelineScreen days={[]} goals={[]} goal={null} onGoal={vi.fn()} onOpen={vi.fn()}/>);
    expect(screen.getByText('아직 남긴 기록이 없어요')).toBeTruthy();
  });
  it('제목 옆 아이콘으로 보기를 바꾸고, 피드 칸을 누르면 펼친 화면을 연다 (2026-10-17)',()=>{
    const onView=vi.fn(),feed=vi.fn(),open=vi.fn();
    render(<RecordTimelineScreen days={days} goals={[]} goal={null} onGoal={vi.fn()} onOpen={open} view="feed" onView={onView} onOpenFeed={feed}/>);
    expect(screen.getByRole('tab',{name:'사진으로 보기'}).getAttribute('aria-selected')).toBe('true');
    fireEvent.click(screen.getByRole('tab',{name:'타임라인으로 보기'}));expect(onView).toHaveBeenCalledWith('timeline');
    // 피드에는 날짜 머리글이 없고, 사진 없는 기록은 메모 글자 칸
    expect(screen.queryByRole('heading',{name:'10월 12일 월요일'})).toBeNull();
    expect(screen.getByText('데미안 3장까지')).toBeTruthy();
    fireEvent.click(screen.getByRole('button',{name:'물 마시기, 사진'}));expect(feed).toHaveBeenCalledWith('s2');expect(open).not.toHaveBeenCalled();
  });
});

describe('기록 펼친 화면 (2026-10-17)',()=>{
  it('기록마다 목표, 날짜, 사진, 메모 전체를 보이고 누르면 그 칸의 기록을 연다',()=>{
    const open=vi.fn();
    render(<RecordFeedScreen posts={[{id:'s2',goalName:'물 마시기',sticker:'basic.flower',date:'10월 12일',photo:{uri:'file:///p.jpg'},memo:'오후에 몰아서 마셨다. 내일은 아침부터 조금씩.'},{id:'s3',goalName:'걷기',sticker:'basic.shoe',date:'10월 9일',memo:'노을'}]} onBack={vi.fn()} onOpen={open}/>);
    expect(screen.getByText('오후에 몰아서 마셨다. 내일은 아침부터 조금씩.')).toBeTruthy();
    expect(screen.getByText('10월 9일')).toBeTruthy();
    fireEvent.click(screen.getByRole('button',{name:'걷기, 10월 9일, 노을'}));expect(open).toHaveBeenCalledWith('s3');
  });
});

describe('스티커 탭',()=>{
  it('둘러보기만 한다: 가진 묶음의 스티커는 고르는 칸이 아니고, 잠긴 묶음을 누르면 묶음 화면을 연다',()=>{
    const openPack=vi.fn();
    render(<StickerCollectionScreen packs={[colorPack('basic','free'),colorPack('animals_normal','locked')]} mine={false} onChangeMine={vi.fn()} openPacks={['basic']} onToggle={vi.fn()} reward={{days:5,goal:7}} onOpenPack={openPack}/>);
    expect(screen.queryAllByRole('radio')).toHaveLength(0);
    fireEvent.click(screen.getByRole('button',{name:'동물 묶음 미리 보기'}));expect(openPack).toHaveBeenCalledWith('animals_normal');
  });
});

describe('흐름 중간 안내',()=>{
  it('체험 열림 카드: [묶음 고르기]와 닫기',()=>{
    const choose=vi.fn(),close=vi.fn();render(<TrialReadyCard days={7} onChoose={choose} onClose={close}/>);
    expect(screen.getByText('스티커 붙인 날 7일을 모았어요')).toBeTruthy();
    fireEvent.click(screen.getByRole('button',{name:'묶음 고르기'}));expect(choose).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button',{name:'닫기'}));expect(close).toHaveBeenCalled();
  });
  it('완성 권하기: [스티커 보기]와 닫기',()=>{
    const go=vi.fn(),close=vi.fn();render(<CompletionNudge onStickers={go} onClose={close}/>);
    fireEvent.click(screen.getByRole('button',{name:'스티커 보기'}));expect(go).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button',{name:'닫기'}));expect(close).toHaveBeenCalled();
  });
});

describe('묶음 카드 한 줄',()=>{
  it('폭에 들어가는 만큼만 보이고 나머지는 +n으로 (폴드 344dp에서 넘치던 것, 2026-10-12)',()=>{
    expect(packRowCount(400,10)).toBe(5);
    expect(packRowCount(262,10)).toBe(3);
    expect(packRowCount(290,5)).toBe(5);
    expect(packRowCount(0,10)).toBe(5);
  });
});
