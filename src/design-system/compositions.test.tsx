import React from 'react';
import {afterEach,describe,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {monthCells,MonthNavigation,CalendarBoard} from './calendar';
import {GoalStickerCell,exampleGoals} from './screen-compositions';
import {ExtendSlotsScreen,GoalSettingsScreen,NewGoalScreen} from './board-screens';
import {PhotoAttachment,SlotCountPicker,StickerPicker} from './composition-controls';
import {PixelDialog,PixelText} from './components';
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
  it('새 목표: 적립판은 칸 수, 달력판은 종료일 선택을 보여주고 입력을 전달한다',()=>{
    const props={name:'',onChangeName:vi.fn(),onChangeKind:vi.fn(),count:'15',onChangeCount:vi.fn(),sticker:'sprout' as const,onChangeSticker:vi.fn(),
      endMode:'none' as const,onChangeEndMode:vi.fn(),onChangeEndDate:vi.fn(),today:'2026-09-30',todayLabel:'9월 30일',onSubmit:vi.fn(),onBack:()=>{}};
    const {rerender}=render(<NewGoalScreen {...props} kind="tally" submitDisabled/>);
    expect(screen.getByRole('button',{name:'만들기'}).getAttribute('aria-disabled')).toBe('true');
    fireEvent.change(screen.getByRole('textbox',{name:'목표 이름'}),{target:{value:'매일 독서'}});expect(props.onChangeName).toHaveBeenCalledWith('매일 독서');
    fireEvent.click(screen.getByRole('button',{name:'직접 입력'}));
    fireEvent.change(screen.getByRole('textbox',{name:'칸 수 직접 입력'}),{target:{value:'180'}});expect(props.onChangeCount).toHaveBeenCalledWith('180');
    expect(screen.queryByRole('button',{name:'날짜 고르기'})).toBeNull();
    rerender(<NewGoalScreen {...props} kind="calendar"/>);
    expect(screen.queryByText('칸 수')).toBeNull();
    fireEvent.click(screen.getByRole('button',{name:'날짜 고르기'}));expect(props.onChangeEndMode).toHaveBeenCalledWith('pick');
  });
  it('칸 늘리기: 1 이상만 받고 늘린 뒤 칸 수를 보여준다. 상한은 없다',()=>{
    const submit=vi.fn();
    const {rerender}=render(<ExtendSlotsScreen name="책 읽기" total={100} add="0" onChangeAdd={()=>{}} onSubmit={submit} onBack={()=>{}}/>);
    expect(screen.getByRole('button',{name:'칸 늘리기'}).getAttribute('aria-disabled')).toBe('true');
    rerender(<ExtendSlotsScreen name="책 읽기" total={100} add="250" onChangeAdd={()=>{}} onSubmit={submit} onBack={()=>{}}/>);
    expect(screen.getByText('늘린 뒤 350칸')).toBeTruthy();
    fireEvent.click(screen.getByRole('button',{name:'칸 늘리기'}));expect(submit).toHaveBeenCalledTimes(1);
  });
  it('버튼 하나짜리 다이얼로그는 보조 버튼을 그리지 않는다',()=>{
    const ok=vi.fn();
    render(<PixelDialog variant="basic" single title="저장하지 못했어요" description="잠시 후 다시 시도해주세요." primaryLabel="확인" onPrimary={ok}/>);
    expect(screen.getAllByRole('button')).toHaveLength(1);
    fireEvent.click(screen.getByRole('button',{name:'확인'}));expect(ok).toHaveBeenCalledTimes(1);
  });
  it('스티커 필터는 해당 그룹만 노출하고 선택값을 전달한다',()=>{
    const change=vi.fn();render(<StickerPicker value="sprout" onChange={change}/>);
    fireEvent.click(screen.getByRole('tab',{name:'사물'}));
    expect(screen.getAllByRole('radio')).toHaveLength(2);expect(screen.queryByRole('radio',{name:'새싹이'})).toBeNull();
    fireEvent.click(screen.getByRole('radio',{name:'운동화'}));expect(change).toHaveBeenCalledWith('shoe');
  });
  it('사진 프레임은 빈 상태에서 추가, 첨부 상태에서 삭제만 노출한다',()=>{
    const choose=vi.fn(),remove=vi.fn();
    const {rerender}=render(<PhotoAttachment actionsInFrame onChoose={choose} onRemove={remove}/>);
    fireEvent.click(screen.getByRole('button',{name:'사진 추가'}));expect(choose).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button',{name:'사진 지우기'})).toBeNull();
    rerender(<PhotoAttachment actionsInFrame preview={<PixelText>첨부 사진</PixelText>} onChoose={choose} onRemove={remove}/>);
    expect(screen.queryByRole('button',{name:'사진 추가'})).toBeNull();
    fireEvent.click(screen.getByRole('button',{name:'사진 지우기'}));expect(remove).toHaveBeenCalledTimes(1);
  });
  it('기록 표식은 기록이 있는 붙인 칸에만 표시한다',()=>{
    const {rerender}=render(<GoalStickerCell number={7} sticker="sprout" state="empty" hasRecord onPress={()=>{}}/>);
    expect(screen.queryByLabelText('사진 또는 메모 기록 있음')).toBeNull();
    rerender(<GoalStickerCell number={7} sticker="sprout" state="filled" hasRecord onPress={()=>{}}/>);
    expect(screen.getByLabelText('사진 또는 메모 기록 있음')).toBeTruthy();
    rerender(<GoalStickerCell number={7} sticker="sprout" state="filled" onPress={()=>{}}/>);
    expect(screen.queryByLabelText('사진 또는 메모 기록 있음')).toBeNull();
  });
  it('달력판도 사진이나 메모가 있는 날짜만 기록 표식을 보여준다',()=>{
    render(<CalendarBoard year={2026} month={9} records={{'2026-09-02':'sprout','2026-09-03':'star'}} recordedDates={new Set(['2026-09-03'])} onSelect={()=>{}} onMonthChange={()=>{}}/>);
    expect(screen.getByRole('button',{name:'9월 2일, 스티커 있음'})).toBeTruthy();
    expect(screen.getByRole('button',{name:'9월 3일, 스티커 있음, 사진 또는 메모 기록 있음'})).toBeTruthy();
    expect(screen.getAllByLabelText('사진 또는 메모 기록 있음')).toHaveLength(1);
  });
});
describe('홈 목록·판 상세 컴포넌트 (2026-09-29)',()=>{
  afterEach(()=>{vi.useRealTimers();});
  it('배지는 tone별 글씨색을 쓰고 badge 토큰 크기다',async ()=>{
    const {PixelBadge,retro}=await import('./index');
    render(<><PixelBadge label="적립판"/><PixelBadge label="완성" tone="primary"/></>);
    expect(getComputedStyle(screen.getByText('적립판')).color).toBe('rgb(199, 222, 148)');
    expect(getComputedStyle(screen.getByText('완성')).color).toBe('rgb(1, 36, 28)');
    expect(getComputedStyle(screen.getByText('적립판')).fontSize).toBe(`${retro.typography.badge.fontSize}px`);
  });
  it('목록 헤더 탭은 선택을 전달하고 + 는 새 목표로 간다',async ()=>{
    const {GoalListHeader}=await import('./index');
    const tab=vi.fn(),add=vi.fn();
    render(<GoalListHeader tab="active" counts={{active:5,completed:2}} onTab={tab} onAdd={add}/>);
    expect(screen.getByRole('tab',{name:'내 목표 5'}).getAttribute('aria-selected')).toBe('true');
    fireEvent.click(screen.getByRole('tab',{name:'완성한 판 2'}));expect(tab).toHaveBeenCalledWith('completed');
    fireEvent.click(screen.getByRole('button',{name:'새 목표 만들기'}));expect(add).toHaveBeenCalledTimes(1);
  });
  it('붙인 칸: 한 번 누르면 기다렸다 떼기, 두 번 누르면 기록만 연다',()=>{
    vi.useFakeTimers();
    const press=vi.fn(),open=vi.fn();
    render(<GoalStickerCell number={3} sticker="star" state="filled" onPress={press} onOpenRecord={open}/>);
    const cell=screen.getByRole('button');
    fireEvent.click(cell);expect(press).not.toHaveBeenCalled();
    vi.advanceTimersByTime(260);expect(press).toHaveBeenCalledTimes(1);expect(open).not.toHaveBeenCalled();
    fireEvent.click(cell);fireEvent.click(cell);vi.advanceTimersByTime(260);
    expect(open).toHaveBeenCalledTimes(1);expect(press).toHaveBeenCalledTimes(1);
  });
  it('기록 열기를 주지 않으면 기존처럼 바로 누른다',()=>{
    const press=vi.fn();render(<GoalStickerCell number={3} sticker="star" state="filled" onPress={press}/>);
    fireEvent.click(screen.getByRole('button'));expect(press).toHaveBeenCalledTimes(1);
  });
  it('완성한 판(readonly)은 한 번 누르기를 무시하고 빈칸은 막는다',()=>{
    vi.useFakeTimers();
    const press=vi.fn(),open=vi.fn();
    const {rerender}=render(<GoalStickerCell number={3} sticker="star" state="filled" readonly onPress={press} onOpenRecord={open}/>);
    fireEvent.click(screen.getByRole('button'));vi.advanceTimersByTime(260);expect(press).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button'));fireEvent.click(screen.getByRole('button'));expect(open).toHaveBeenCalledTimes(1);
    rerender(<GoalStickerCell number={4} sticker="star" state="available" readonly enabled onPress={press} onOpenRecord={open}/>);
    fireEvent.click(screen.getByRole('button'));vi.advanceTimersByTime(260);expect(press).not.toHaveBeenCalled();
  });
  it('달력: 스티커 있는 날은 두 번 눌러 기록을 열고, 비활성 날짜는 막는다',()=>{
    vi.useFakeTimers();
    const select=vi.fn(),open=vi.fn();
    render(<CalendarBoard year={2026} month={9} records={{'2026-09-02':'shoe'}} onSelect={select} onMonthChange={()=>{}} onOpenRecord={open} isDateEnabled={date=>date<='2026-09-23'}/>);
    const second=screen.getByRole('button',{name:'9월 2일, 스티커 있음'});
    fireEvent.click(second);fireEvent.click(second);vi.advanceTimersByTime(260);
    expect(open).toHaveBeenCalledWith('2026-09-02');expect(select).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button',{name:'9월 5일'}));expect(select).toHaveBeenCalledWith('2026-09-05');
    fireEvent.click(screen.getByRole('button',{name:'9월 24일'}));expect(select).toHaveBeenCalledTimes(1);
  });
  it('기간 필드: 시작일은 바꿀 수 없고, 종료일은 마지막으로 붙인 날 다음 날부터 고른다',async ()=>{
    const {PeriodField}=await import('./index');
    const change=vi.fn();
    render(<PeriodField startDate="2026-09-10" endDate="2026-10-31" lastPlacedDate="2026-09-29" picking onPick={()=>{}} onChange={change} onClear={()=>{}}/>);
    expect(screen.getByText('만든 날이라 바꿀 수 없어요')).toBeTruthy();
    // 종료일(10월)이 있는 달에서 열린다. 9월로 돌아가면 마지막으로 붙인 29일까지는 고를 수 없다.
    fireEvent.click(screen.getByRole('button',{name:'이전 달'}));
    fireEvent.click(screen.getByRole('button',{name:'9월 29일'}));expect(change).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button',{name:'9월 30일'}));expect(change).toHaveBeenCalledWith('2026-09-30');
  });
  it('읽기 전용 기록은 저장·떼기·사진 동작을 숨기고 메모를 고칠 수 없다',async ()=>{
    const {RecordScreen}=await import('./index');
    render(<RecordScreen readonly goal={exampleGoals[0]} date="2026년 9월 12일" initialMemo="한 챕터" onChoosePhoto={()=>{}} onRemovePhoto={()=>{}} onBack={()=>{}} onSave={()=>{}} onRemoveSticker={()=>{}}/>);
    expect(screen.queryByRole('button',{name:'저장'})).toBeNull();
    expect(screen.queryByRole('button',{name:'스티커 떼기'})).toBeNull();
    expect(screen.queryByRole('button',{name:/사진/})).toBeNull();
    expect((screen.getByRole('textbox',{name:'메모'}) as HTMLTextAreaElement).readOnly).toBe(true);
  });
  it('기간 없는 달력판 완성 안내는 계속하기로 다시 이어 쓸 수 있다고 알린다 (2026-09-30)',()=>{
    render(<GoalSettingsScreen name="산책" onChangeName={()=>{}} sticker="sprout" onChangeSticker={()=>{}} onComplete={()=>{}} onSave={()=>{}} onDelete={()=>{}} onBack={()=>{}}/>);
    expect(screen.getByText(/계속하기로 다시 이어 쓸 수 있어요/)).toBeTruthy();
    expect(screen.queryByText(/되돌릴 수 없어요/)).toBeNull();
  });
  it('칸 수 선택: min보다 작은 버튼은 비활성이고, 버튼에 없는 값이면 직접 입력으로 연다 (2026-09-30)',()=>{
    const change=vi.fn();
    const {rerender}=render(<SlotCountPicker value="30" onChange={change} min={30}/>);
    expect(screen.getByRole('button',{name:'15'}).getAttribute('aria-disabled')).toBe('true');
    expect(screen.getByRole('button',{name:'20'}).getAttribute('aria-disabled')).toBe('true');
    expect(screen.getByRole('button',{name:'30'}).getAttribute('aria-disabled')).not.toBe('true');
    fireEvent.click(screen.getByRole('button',{name:'15'}));expect(change).not.toHaveBeenCalled();
    cleanup();
    render(<SlotCountPicker value="25" onChange={change} min={25}/>);
    expect((screen.getByRole('textbox',{name:'칸 수 직접 입력'}) as HTMLInputElement).value).toBe('25');
    cleanup();
    render(<SlotCountPicker value="1200" onChange={change} min={1200}/>);
    expect((screen.getByRole('textbox',{name:'칸 수 직접 입력'}) as HTMLInputElement).value).toBe('1200');
    void rerender;
  });
  it('목표 설정: 적립판 칸 수는 늘리기만 된다고 알리고, 오류가 있으면 보여준다 (2026-09-30)',()=>{
    const slots={current:30,value:'15',onChange:vi.fn(),error:'지금 30칸보다 줄일 수 없어요.'};
    render(<GoalSettingsScreen name="독서" onChangeName={()=>{}} sticker="sprout" onChangeSticker={()=>{}} slots={slots} onSave={()=>{}} saveDisabled onDelete={()=>{}} onBack={()=>{}}/>);
    expect(screen.getByText('지금 30칸 · 늘리기만 할 수 있어요')).toBeTruthy();
    expect(screen.getByText('지금 30칸보다 줄일 수 없어요.')).toBeTruthy();
  });
});
