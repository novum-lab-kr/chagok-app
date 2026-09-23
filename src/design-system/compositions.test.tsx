import React from 'react';
import {afterEach,describe,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {monthCells,MonthNavigation} from './calendar';
import {GoalEditorScreen,exampleGoals} from './screen-compositions';
import {StickerPicker} from './composition-controls';
afterEach(cleanup);
describe('화면 구성 컴포넌트',()=>{
  it('월별 시작 요일, 윤년과 마지막 주 빈칸을 계산한다',()=>{
    expect(monthCells(2026,9).slice(0,4)).toEqual([null,null,1,2]);
    expect(monthCells(2026,9).filter(Boolean)).toHaveLength(30);
    expect(monthCells(2024,2).filter(Boolean)).toHaveLength(29);
    expect(monthCells(2025,2).filter(Boolean)).toHaveLength(28);
    expect(monthCells(2026,8)).toHaveLength(42);
    expect(monthCells(2026,9).length%7).toBe(0);
  });
  it('달력 월 이동은 연도 경계도 넘는다',()=>{
    const change=vi.fn();const {rerender}=render(<MonthNavigation year={2026} month={1} onChange={change}/>);
    fireEvent.click(screen.getByRole('button',{name:'이전 달'}));expect(change).toHaveBeenLastCalledWith(2025,12);
    rerender(<MonthNavigation year={2026} month={12} onChange={change}/>);
    fireEvent.click(screen.getByRole('button',{name:'다음 달'}));expect(change).toHaveBeenLastCalledWith(2027,1);
  });
  it('목표 이름과 직접 입력 칸 수를 검증하고 선택값을 제출한다',()=>{
    const submit=vi.fn();render(<GoalEditorScreen mode="create" onBack={()=>{}} onSubmit={submit}/>);
    expect(screen.getByRole('button',{name:'만들기'}).getAttribute('aria-disabled')).toBe('true');
    fireEvent.change(screen.getByRole('textbox',{name:'목표 이름'}),{target:{value:'매일 독서'}});
    fireEvent.click(screen.getByRole('button',{name:'직접 입력'}));
    fireEvent.change(screen.getByRole('textbox',{name:'칸 수 직접 입력'}),{target:{value:'0'}});
    expect(screen.getByRole('button',{name:'만들기'}).getAttribute('aria-disabled')).toBe('true');
    fireEvent.change(screen.getByRole('textbox',{name:'칸 수 직접 입력'}),{target:{value:'18'}});
    fireEvent.click(screen.getByRole('button',{name:'만들기'}));
    expect(submit).toHaveBeenCalledWith({name:'매일 독서',kind:'tally',total:18,sticker:'sprout'});
  });
  it('설정에서 기존 판 종류와 칸 수를 보존하면서 이름·스티커를 바꾼다',()=>{
    const submit=vi.fn();render(<GoalEditorScreen mode="settings" initialGoal={exampleGoals[0]} onBack={()=>{}} onSubmit={submit}/>);
    expect(screen.queryByRole('radiogroup')).toBeNull();
    fireEvent.change(screen.getByRole('textbox',{name:'목표 이름'}),{target:{value:'독서 기록'}});
    fireEvent.click(screen.getByRole('radio',{name:'별'}));fireEvent.click(screen.getByRole('button',{name:'저장하기'}));
    expect(submit).toHaveBeenCalledWith({name:'독서 기록',kind:'tally',total:15,sticker:'star'});
  });
  it('스티커 필터는 해당 그룹만 노출하고 선택값을 전달한다',()=>{
    const change=vi.fn();render(<StickerPicker value="sprout" onChange={change}/>);
    fireEvent.click(screen.getByRole('tab',{name:'사물'}));
    expect(screen.getAllByRole('radio')).toHaveLength(2);expect(screen.queryByRole('radio',{name:'새싹이'})).toBeNull();
    fireEvent.click(screen.getByRole('radio',{name:'운동화'}));expect(change).toHaveBeenCalledWith('shoe');
  });
});
