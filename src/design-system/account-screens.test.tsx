import React from 'react';
import {afterEach,describe,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {AccountBackupPanel,AccountStartScreen,ConsentScreen,DeleteAccountScreen,RestoreConflictScreen} from './account-screens';
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
  it('이용약관은 체크 행에 보기가 붙어 한 번만 나온다 (2026-10-01 2안)',()=>{
    render(<ConsentScreen {...base} ageChecked={false} termsChecked={false}/>);
    expect(screen.queryByRole('button',{name:'이용약관'})).toBeNull();
    expect(screen.getAllByText(/이용약관/)).toHaveLength(1);
  });
  it('만 14세 미만 링크는 밑줄로 누를 수 있음을 보인다 (2026-10-01 가안)',()=>{
    render(<ConsentScreen {...base} ageChecked={false} termsChecked={false}/>);
    expect(getComputedStyle(screen.getByText('만 14세 미만이에요')).textDecorationLine).toBe('underline');
  });
});
describe('계정 시작 화면',()=>{
  it('고른 쪽을 체크 상태로 보이고 다른 쪽을 고르면 알린다',()=>{
    const change=vi.fn(),next=vi.fn();
    render(<AccountStartScreen value="account" onChange={change} onContinue={next}/>);
    expect(screen.getByRole('radio',{name:'계정 연결하기'}).getAttribute('aria-checked')).toBe('true');
    fireEvent.click(screen.getByRole('radio',{name:'이 기기에서만 쓰기'}));expect(change).toHaveBeenCalledWith('local');
    fireEvent.click(screen.getByRole('button',{name:'계속'}));expect(next).toHaveBeenCalled();
  });
});
describe('계정과 백업 칸',()=>{
  const handlers={onConnect:vi.fn(),onLogin:vi.fn(),onLogout:vi.fn(),onDelete:vi.fn()};
  it('계정이 없으면 연결 버튼만 보인다',()=>{
    render(<AccountBackupPanel status={{state:'local'}} {...handlers}/>);
    fireEvent.click(screen.getByRole('button',{name:'계정 연결하기'}));expect(handlers.onConnect).toHaveBeenCalled();
    expect(screen.queryByRole('button',{name:'로그아웃'})).toBeNull();
  });
  it('연결되면 계정, 마지막 백업, 로그아웃·계정 삭제 순으로 보인다',()=>{
    render(<AccountBackupPanel status={{state:'synced',provider:'Apple',backedUpAt:'오늘 9:20'}} {...handlers}/>);
    expect(screen.getByText('연결한 계정')).toBeTruthy();expect(screen.getByText('Apple')).toBeTruthy();
    expect(screen.getByText('마지막 백업')).toBeTruthy();expect(screen.getByText('오늘 9:20')).toBeTruthy();
    fireEvent.click(screen.getByRole('button',{name:'계정 삭제'}));expect(handlers.onDelete).toHaveBeenCalled();
  });
  it('로그인이 풀리면 로그인 버튼을 함께 보인다',()=>{
    render(<AccountBackupPanel status={{state:'needsLogin',provider:'Google'}} {...handlers}/>);
    expect(screen.getByText('백업하려면 로그인이 필요해요')).toBeTruthy();
    fireEvent.click(screen.getByRole('button',{name:'로그인'}));expect(handlers.onLogin).toHaveBeenCalled();
  });
  it('복원 중에는 로그아웃·계정 삭제를 숨긴다',()=>{
    render(<AccountBackupPanel status={{state:'restoring',provider:'Apple'}} {...handlers}/>);
    expect(screen.queryByRole('button',{name:'로그아웃'})).toBeNull();
  });
});
describe('복원 충돌 화면',()=>{
  const snap={goals:4,stickers:38,goalNames:['책 읽기','매일 산책하기','물 여덟 잔 마시기','일기 쓰기'],updatedAt:'9월 27일'};
  it('목표 이름은 둘까지 보이고 버튼 글자는 고른 쪽을 따른다',()=>{
    const change=vi.fn();
    const {rerender}=render(<RestoreConflictScreen value="server" onChange={change} server={snap} device={{...snap,goalNames:['일기 쓰기']}} onConfirm={vi.fn()} onBack={vi.fn()}/>);
    expect(screen.getByText('책 읽기, 매일 산책하기 외 2개')).toBeTruthy();
    expect(screen.getByRole('button',{name:'서버 백업 사용하기'})).toBeTruthy();
    fireEvent.click(screen.getByRole('radio',{name:'이 기기 기록'}));expect(change).toHaveBeenCalledWith('device');
    rerender(<RestoreConflictScreen value="device" onChange={change} server={snap} device={snap} onConfirm={vi.fn()} onBack={vi.fn()}/>);
    expect(screen.getByRole('button',{name:'이 기기 기록 사용하기'})).toBeTruthy();
  });
});
describe('계정 삭제 화면',()=>{
  it('삭제와 취소를 전달한다',()=>{
    const del=vi.fn(),cancel=vi.fn();
    render(<DeleteAccountScreen onDelete={del} onCancel={cancel} onBack={vi.fn()}/>);
    fireEvent.click(screen.getByRole('button',{name:'계정 삭제하기'}));fireEvent.click(screen.getByRole('button',{name:'취소'}));
    expect(del).toHaveBeenCalled();expect(cancel).toHaveBeenCalled();
  });
});
