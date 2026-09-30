import React from 'react';
import {afterEach,describe,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {ConsentScreen} from './account-screens';
afterEach(cleanup);
const base={onToggleAge:vi.fn(),onToggleTerms:vi.fn(),onViewTerms:vi.fn(),onViewPrivacy:vi.fn(),onUnder14:vi.fn(),onBack:vi.fn(),loginButtons:<button>Google로 계속</button>};
describe('동의 화면',()=>{
  it('두 체크가 모두 켜지기 전에는 로그인 영역이 비활성이다',()=>{
    const {rerender}=render(<ConsentScreen {...base} ageChecked termsChecked={false}/>);
    expect(screen.getByTestId('login-area').getAttribute('aria-disabled')).toBe('true');
    rerender(<ConsentScreen {...base} ageChecked termsChecked/>);
    expect(screen.getByTestId('login-area').getAttribute('aria-disabled')).toBeNull(); // RNW는 false를 속성으로 쓰지 않는다
  });
  it('체크·보기·14세 미만 링크를 전달한다',()=>{
    render(<ConsentScreen {...base} ageChecked={false} termsChecked={false}/>);
    fireEvent.click(screen.getByRole('checkbox',{name:'[필수] 만 14세 이상이에요'}));expect(base.onToggleAge).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('checkbox',{name:'[필수] 이용약관에 동의해요'}));expect(base.onToggleTerms).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button',{name:'이용약관 보기'}));expect(base.onViewTerms).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button',{name:'개인정보 처리방침 보기'}));expect(base.onViewPrivacy).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button',{name:'만 14세 미만이에요'}));expect(base.onUnder14).toHaveBeenCalled();
  });
});
