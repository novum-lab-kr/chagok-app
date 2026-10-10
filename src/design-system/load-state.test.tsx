import React from 'react';
import {afterEach,describe,expect,it,vi} from 'vitest';
import {act,cleanup,fireEvent,render,renderHook,screen} from '@testing-library/react';
import {LoadingScreen,ScreenFailed,screenFailureCopy,useLoadRetry} from './load-state';
afterEach(cleanup);

describe('ScreenFailed — 화면을 보여 주지 못할 때 (2026-10-10 B안)',()=>{
  it('무엇을 못 보여 줬는지에 따라 문구가 다르다',()=>{
    expect(screenFailureCopy.records.title).toBe('기록을 불러오지 못했어요');
    expect(screenFailureCopy.goals.title).toBe('목표를 불러오지 못했어요');
    expect(screenFailureCopy.stickers.title).toBe('스티커를 불러오지 못했어요');
    expect(screenFailureCopy.screen.title).toBe('화면을 보여 주지 못했어요');
  });
  it('[다시 시도] [홈으로]를 보이고 각각 부른다',()=>{
    const onRetry=vi.fn(),onHome=vi.fn();
    render(<ScreenFailed kind="stickers" onRetry={onRetry} onHome={onHome}/>);
    expect(screen.getByText('스티커를 불러오지 못했어요')).toBeTruthy();
    fireEvent.click(screen.getByText('다시 시도'));
    fireEvent.click(screen.getByText('홈으로'));
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onHome).toHaveBeenCalledTimes(1);
  });
  it('홈 화면처럼 onHome이 없으면 [홈으로]를 두지 않는다',()=>{
    render(<ScreenFailed kind="goals" onRetry={()=>{}}/>);
    expect(screen.queryByText('홈으로')).toBeNull();
  });
});

describe('LoadingScreen',()=>{
  it('읽는 중에는 로딩 점만 보인다',()=>{
    render(<LoadingScreen failed={false} kind="records" onRetry={()=>{}}/>);
    expect(screen.getByLabelText('불러오는 중')).toBeTruthy();
    expect(screen.queryByText('기록을 불러오지 못했어요')).toBeNull();
  });
  it('실패하면 그 화면의 문구로 안내한다',()=>{
    render(<LoadingScreen failed kind="records" onRetry={()=>{}} onHome={()=>{}}/>);
    expect(screen.getByText('기록을 불러오지 못했어요')).toBeTruthy();
    expect(screen.getByText('잠시 뒤 다시 시도해 주세요.')).toBeTruthy();
  });
});

describe('useLoadRetry',()=>{
  it('실패를 표시하고, 다시 시도하면 실패를 지우고 attempt를 올린다',()=>{
    const {result}=renderHook(()=>useLoadRetry());
    expect(result.current.failed).toBe(false);
    act(()=>result.current.fail());
    expect(result.current.failed).toBe(true);
    const before=result.current.attempt;
    act(()=>result.current.retry());
    expect(result.current.failed).toBe(false);
    expect(result.current.attempt).toBe(before+1);
  });
});
