import React from 'react';
import {afterEach,describe,expect,it} from 'vitest';
import {cleanup,render,screen} from '@testing-library/react';
import {WidgetEmptyPreview,WidgetMediumPreview,WidgetSmallPreview} from './widget-preview';
import type {WidgetGoalView} from './widget-preview';
afterEach(cleanup);
const cal:WidgetGoalView={id:'g',name:'산책하기',sticker:'sprout',kind:'달력판',progressLabel:'이번 달 62%',percent:62,
  mini:{type:'calendar',year:2026,month:9,firstWeekday:2,days:['filled','missed',...Array(28).fill('future')]}};
const tally:WidgetGoalView={id:'t',name:'책 읽기',sticker:'book',kind:'적립판',progressLabel:'45%',percent:45,
  mini:{type:'tally',from:31,cells:[...Array(15).fill('filled'),...Array(15).fill('empty')],placed:45,total:100}};
describe('위젯 미리보기',()=>{
  it('작은 크기는 이름·판 종류·진행 문구를 보여준다',()=>{
    render(<WidgetSmallPreview goal={cal}/>);
    expect(screen.getByText('산책하기')).toBeTruthy();
    expect(screen.getByText('달력판')).toBeTruthy();
    expect(screen.getByText('이번 달 62%')).toBeTruthy();
  });
  it('중간 크기 달력판은 날짜 칸을 그린다',()=>{
    render(<WidgetMediumPreview goal={cal}/>);
    expect(screen.getAllByTestId(/^day-/)).toHaveLength(30);
  });
  it('중간 크기 적립판은 묶음 칸과 전체 수를 보여준다',()=>{
    render(<WidgetMediumPreview goal={tally}/>);
    expect(screen.getAllByTestId(/^slot-/)).toHaveLength(30);
    expect(screen.getByTestId('slot-31')).toBeTruthy();
    expect(screen.getByText('45/100 · 45%')).toBeTruthy();
  });
  it('목표가 없으면 안내만 보여준다',()=>{
    render(<WidgetEmptyPreview/>);
    expect(screen.getByText('첫 목표를 만들어 보세요')).toBeTruthy();
  });
});
