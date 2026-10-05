import React from 'react';
import { describe,it,expect,afterEach,vi } from 'vitest';
import { render,screen,fireEvent,cleanup } from '@testing-library/react';
import { PixelButton,PixelDialog,PixelFrame,PixelInput,PixelText,SettingRow,ShortNotice,PixelLoadingIndicator,StickerFilters,ProgressBar,StickerSlot,retro } from './index';
afterEach(cleanup);
describe('공통 컴포넌트 동작',()=>{
  it('픽셀 틀 SVG는 크기를 재기 전부터 있다 — 크기가 바뀌면 key로 새로 만든다(iOS는 만든 뒤 크기만 바꾸면 다시 그리지 않는다, 2026-10-04)',()=>{
    const {container}=render(<PixelFrame variant="input"><PixelText>런닝 30분</PixelText></PixelFrame>);
    // 레이아웃 이벤트가 오기 전(jsdom은 onLayout을 보내지 않는다)에도 틀 SVG가 이미 있어야 한다
    expect(container.querySelector('svg')).toBeTruthy();
  });
  it('활성 버튼만 동작하고 비활성·저장 중 버튼은 호출하지 않는다',()=>{
    const onPress=vi.fn();
    const {rerender}=render(<PixelButton label="저장하기" onPress={onPress}/>);
    fireEvent.click(screen.getByRole('button',{name:'저장하기'}));expect(onPress).toHaveBeenCalledTimes(1);
    rerender(<PixelButton label="저장하기" disabled onPress={onPress}/>);fireEvent.click(screen.getByRole('button'));
    rerender(<PixelButton label="저장하기" loading onPress={onPress}/>);fireEvent.click(screen.getByRole('button',{name:'저장 중'}));
    expect(onPress).toHaveBeenCalledTimes(1);expect(screen.getByRole('button').getAttribute('aria-busy')).toBe('true');
  });
  it('입력된 한글을 유지하며 텍스트와 입력에 같은 실제 폰트 이름을 사용한다',()=>{
    const changed=vi.fn();render(<><PixelText>차곡차곡</PixelText><PixelInput label="목표 이름" defaultValue="책 읽기" onChangeText={changed}/></>);
    const input=screen.getByRole('textbox',{name:'목표 이름'}) as HTMLInputElement;
    fireEvent.change(input,{target:{value:'매일 책 읽기'}});
    expect(changed).toHaveBeenCalledWith('매일 책 읽기');expect(input.value).toBe('매일 책 읽기');
    expect(getComputedStyle(input).fontFamily).toContain('NeoDunggeunmo');
    expect(getComputedStyle(screen.getByText('차곡차곡')).fontFamily).toContain('NeoDunggeunmo');
  });
  it('필터 선택을 전달하고 테두리를 만들지 않는다',()=>{
    const change=vi.fn();const {rerender}=render(<StickerFilters value="전체" onChange={change}/>);
    fireEvent.click(screen.getByRole('tab',{name:'친구'}));expect(change).toHaveBeenCalledWith('친구');
    rerender(<StickerFilters value="친구" onChange={change}/>);
    expect(screen.getByRole('tab',{name:'친구'}).getAttribute('aria-selected')).toBe('true');
    for(const tab of screen.getAllByRole('tab'))expect(parseFloat(getComputedStyle(tab).borderTopWidth)||0).toBe(0);
  });
  it('진행률 0분모와 범위 밖 값을 접근성 값에 노출하지 않는다',()=>{
    const {rerender}=render(<ProgressBar value={6} total={15}/>);
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('40');
    rerender(<ProgressBar value={6} total={0}/>);expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('0');
    rerender(<ProgressBar value={40} total={15}/>);expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('100');
  });
  it('빈칸은 조작을 차단하고 붙일 수 있는 칸은 동작을 전달한다',()=>{
    const press=vi.fn();const {rerender}=render(<StickerSlot number={7} onPress={press}/>);fireEvent.click(screen.getByRole('button'));expect(press).not.toHaveBeenCalled();
    rerender(<StickerSlot number={7} state="available" onPress={press}/>);fireEvent.click(screen.getByRole('button'));expect(press).toHaveBeenCalledTimes(1);
    rerender(<StickerSlot number={7} state="filled" onPress={press}/>);expect(screen.getByRole('button').getAttribute('aria-label')).toContain('새싹이 스티커');
  });
  it('사용자 지정 본문색과 버튼 글씨색을 분리해서 실제 요소에 적용한다',()=>{
    render(<><PixelText>본문</PixelText><PixelButton label="확인"/></>);
    expect(getComputedStyle(screen.getByText('본문')).color).toBe('rgb(6, 38, 28)');
    expect(getComputedStyle(screen.getByText('확인')).color).toBe('rgb(1, 36, 28)');
    expect(retro.color.screen).toBe('#AFE1CB');expect(retro.color.lcd).toBe('#C7DE94');
  });
  it('일반 다이얼로그는 단계 없이 같은 제목·설명·버튼 동작을 사용한다',()=>{
    const confirm=vi.fn(),cancel=vi.fn();
    const {rerender}=render(<PixelDialog variant="basic" step="1 / 3" title="목표를 삭제할까요?" description="기록도 사라져요." primaryLabel="삭제하기" secondaryLabel="취소" onPrimary={confirm} onSecondary={cancel}/>);
    expect(screen.getByText('목표를 삭제할까요?')).toBeTruthy();
    expect(screen.getByText('기록도 사라져요.')).toBeTruthy();
    expect(getComputedStyle(screen.getByText('목표를 삭제할까요?')).textAlign).toBe('center');
    expect(getComputedStyle(screen.getByText('기록도 사라져요.')).textAlign).toBe('center');
    expect(screen.queryByText('1 / 3')).toBeNull();
    fireEvent.click(screen.getByRole('button',{name:'삭제하기'}));
    fireEvent.click(screen.getByRole('button',{name:'취소'}));
    expect(confirm).toHaveBeenCalledTimes(1);expect(cancel).toHaveBeenCalledTimes(1);
    rerender(<PixelDialog step="1 / 3" title="목표 만들기" description="목표를 만들어요."/>);
    expect(screen.getByText('1 / 3')).toBeTruthy();
    expect(getComputedStyle(screen.getByText('목표 만들기')).textAlign).not.toBe('center');
  });
  it('진행 중 다이얼로그는 주 버튼을 로딩으로, 보조 버튼을 비활성으로 둔다',()=>{
    const confirm=vi.fn(),cancel=vi.fn();
    render(<PixelDialog variant="basic" title="로그아웃할까요?" description="먼저 백업해요." primaryLabel="로그아웃" secondaryLabel="취소" onPrimary={confirm} onSecondary={cancel} loading/>);
    fireEvent.click(screen.getByRole('button',{name:'진행 중'}));
    fireEvent.click(screen.getByRole('button',{name:'취소'}));
    expect(confirm).not.toHaveBeenCalled();expect(cancel).not.toHaveBeenCalled();
    expect(screen.getByRole('button',{name:'진행 중'}).getAttribute('aria-busy')).toBe('true');
  });
  it('설정 행은 값과 이동 동작을 제공하고 비활성 상태에서는 눌리지 않는다',()=>{
    const press=vi.fn();const {rerender}=render(<SettingRow label="계정 연결" value="Apple" onPress={press}/>);
    fireEvent.click(screen.getByRole('button',{name:'계정 연결, Apple'}));expect(press).toHaveBeenCalledTimes(1);
    rerender(<SettingRow label="계정 연결" value="Apple" onPress={press} disabled/>);
    fireEvent.click(screen.getByRole('button',{name:'계정 연결, Apple'}));expect(press).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button').getAttribute('aria-disabled')).toBe('true');
  });
  it('짧은 알림과 로딩 표시는 상태를 접근성 이름으로 전달한다',()=>{
    render(<><ShortNotice title="이 기기에 기록했어요" detail="연결되면 자동으로 백업해요."/><PixelLoadingIndicator label="백업 중"/></>);
    expect(screen.getByRole('alert').textContent).toContain('연결되면 자동으로 백업해요.');
    expect(screen.getByRole('progressbar',{name:'백업 중'})).toBeTruthy();
  });
});
describe('로딩 표시',()=>{
  afterEach(()=>{vi.useRealTimers();});
  it('저장 중 버튼은 글자를 투명하게 남겨 폭을 유지하고, 로딩 점이 움직인다',async ()=>{
    vi.useFakeTimers();
    const {act}=await import('@testing-library/react');
    render(<PixelButton label="저장하기" loading/>);
    const button=screen.getByRole('button',{name:'저장 중'});
    expect(button.getAttribute('aria-busy')).toBe('true');
    expect(getComputedStyle(screen.getByText('저장하기')).opacity).toBe('0');
    const dots=()=>Array.from(button.querySelectorAll<HTMLElement>('div')).filter(el=>el.style.width==='8px'&&el.style.height==='8px').map(el=>el.style.opacity);
    const before=dots();expect(before).toHaveLength(3);
    await act(async()=>{vi.advanceTimersByTime(260);});
    expect(dots()).not.toEqual(before);
  });
});
