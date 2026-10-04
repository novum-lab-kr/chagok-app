import React from 'react';
import {afterEach,describe,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {WidgetBoardMedium,WidgetBoardSmall,WidgetEmpty,WidgetRingMedium,WidgetRingSmall} from './widget-preview';
import type {WidgetGoalView} from './widget-preview';
afterEach(cleanup);
const cal:WidgetGoalView={id:'g',name:'산책하기',sticker:'sprout',kind:'달력판',progressLabel:'이번 달 62%',percent:62,
  mini:{type:'calendar',year:2026,month:9,firstWeekday:2,days:['filled','missed',...Array(28).fill('future')]}};
const tally:WidgetGoalView={id:'t',name:'책 읽기',sticker:'book',kind:'적립판',progressLabel:'45%',percent:45,
  mini:{type:'tally',from:41,cells:[...Array(5).fill('filled'),...Array(15).fill('empty')],placed:45,total:100}};
const water:WidgetGoalView={...cal,id:'w',name:'물 마시기'};
const extra:WidgetGoalView={...cal,id:'x',name:'네 번째'};

describe('링 위젯',()=>{
  it('작은 크기는 진행률과 "채웠어요", 이름을 보여 주고 판 종류 배지는 없다',()=>{
    render(<WidgetRingSmall goal={cal}/>);
    expect(screen.getByText('62%')).toBeTruthy();
    expect(screen.getByText('채웠어요')).toBeTruthy();
    expect(screen.getByText('산책하기')).toBeTruthy();
    expect(screen.queryByText('달력판')).toBeNull();
  });
  it('중간 크기는 목표를 세 개까지만 보여 준다',()=>{
    render(<WidgetRingMedium goals={[cal,tally,water,extra]}/>);
    expect(screen.getByText('물 마시기')).toBeTruthy();
    expect(screen.queryByText('네 번째')).toBeNull();
  });
  it('링 안쪽을 누르면 붙이고, 그 밖을 누르면 판 상세를 연다',()=>{
    const onStick=vi.fn(),onOpen=vi.fn();
    render(<WidgetRingSmall goal={cal} onStick={onStick} onOpen={onOpen}/>);
    fireEvent.click(screen.getByLabelText('산책하기에 붙이기'));
    expect(onStick).toHaveBeenCalledWith('g');
    expect(onOpen).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('산책하기'));
    expect(onOpen).toHaveBeenCalledWith('g');
  });
  it('방금 붙였으면 되돌리기를 보여 준다',()=>{
    const onUndo=vi.fn();
    render(<WidgetRingSmall goal={cal} justPlaced onUndo={onUndo}/>);
    fireEvent.click(screen.getByText('되돌리기'));
    expect(onUndo).toHaveBeenCalledWith('g');
  });
});

describe('달력 위젯',()=>{
  it('달력판은 이번 달 날짜 칸을 그리고 "이번 달"을 붙인다',()=>{
    render(<WidgetBoardMedium goal={cal}/>);
    expect(screen.getAllByTestId(/^day-/)).toHaveLength(30);
    expect(screen.getByText('이번 달')).toBeTruthy();
    expect(screen.getByText('62%')).toBeTruthy();
  });
  it('적립판은 개수 없이 %만 보여 준다',()=>{
    render(<WidgetBoardMedium goal={tally}/>);
    expect(screen.getAllByTestId(/^slot-/)).toHaveLength(20);
    expect(screen.getByText('45%')).toBeTruthy();
    expect(screen.queryByText(/45\/100/)).toBeNull();
  });
  it('판을 누르면 붙인다',()=>{
    const onStick=vi.fn();
    render(<WidgetBoardSmall goal={cal} onStick={onStick}/>);
    fireEvent.click(screen.getByLabelText('산책하기에 붙이기'));
    expect(onStick).toHaveBeenCalledWith('g');
  });
});

describe('목표 없음',()=>{
  it('첫 목표 만들기로 안내하고, 중간 크기에는 버튼 모양을 둔다',()=>{
    const onCreate=vi.fn();
    render(<WidgetEmpty size="medium" onCreate={onCreate}/>);
    expect(screen.getByText('첫 목표를 만들어 보세요')).toBeTruthy();
    fireEvent.click(screen.getByText('목표 만들기'));
    expect(onCreate).toHaveBeenCalled();
  });
});
