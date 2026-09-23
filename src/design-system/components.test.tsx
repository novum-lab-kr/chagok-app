import React from 'react';
import { describe,it,expect,afterEach,vi } from 'vitest';
import { render,screen,fireEvent,cleanup } from '@testing-library/react';
import { PixelButton,PixelInput,PixelText,StickerFilters,ProgressBar,StickerSlot,retro } from './index';
afterEach(cleanup);
describe('공통 컴포넌트 동작',()=>{
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
});
