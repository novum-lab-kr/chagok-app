import React from 'react';
import {afterEach,describe,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {PixelBottomSheet} from './composition-controls';
import {PixelText} from './components';
afterEach(cleanup);
describe('바닥 시트',()=>{
  it('제목과 내용을 보인다',()=>{
    render(<PixelBottomSheet visible title="처음 오셨네요" onRequestClose={vi.fn()}><PixelText>본문</PixelText></PixelBottomSheet>);
    expect(screen.getByRole('heading',{name:'처음 오셨네요'})).toBeTruthy();
    expect(screen.getByText('본문')).toBeTruthy();
  });
  it('배경을 누르면 닫기를 부른다 (닫을지는 부르는 쪽이 정한다)',()=>{
    const close=vi.fn();
    render(<PixelBottomSheet visible title="처음 오셨네요" onRequestClose={close}><PixelText>본문</PixelText></PixelBottomSheet>);
    fireEvent.click(screen.getByTestId('sheet-scrim'));
    expect(close).toHaveBeenCalledTimes(1);
  });
  it('visible이 false면 그리지 않는다',()=>{
    render(<PixelBottomSheet visible={false} title="처음 오셨네요" onRequestClose={vi.fn()}><PixelText>본문</PixelText></PixelBottomSheet>);
    expect(screen.queryByText('본문')).toBeNull();
  });
});
