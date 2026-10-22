import React from 'react';
import {afterEach,describe,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {AccountBackupPanel,AccountLoginScreen,ConsentSheet,DeleteAccountScreen,GoogleLoginButton,KakaoLoginButton,RestoreConflictScreen} from './account-screens';
afterEach(cleanup);
describe('카카오 로그인 버튼 (카카오 디자인 가이드)',()=>{
  it('글자는 카카오로 계속하기이고 누르면 전달한다',()=>{
    const press=vi.fn();
    render(<KakaoLoginButton onPress={press}/>);
    fireEvent.click(screen.getByRole('button',{name:'카카오로 계속하기'}));expect(press).toHaveBeenCalled();
  });
  it('막혀 있으면 누를 수 없다',()=>{
    const press=vi.fn();
    render(<KakaoLoginButton onPress={press} disabled/>);
    fireEvent.click(screen.getByRole('button',{name:'카카오로 계속하기'}));expect(press).not.toHaveBeenCalled();
  });
});
describe('Google 로그인 버튼 (Google 브랜드 가이드)',()=>{
  it('글자는 Google로 계속하기이고 누르면 전달한다',()=>{
    const press=vi.fn();
    render(<GoogleLoginButton onPress={press}/>);
    fireEvent.click(screen.getByRole('button',{name:'Google로 계속하기'}));expect(press).toHaveBeenCalled();
  });
  it('막혀 있으면 누를 수 없다',()=>{
    const press=vi.fn();
    render(<GoogleLoginButton onPress={press} disabled/>);
    fireEvent.click(screen.getByRole('button',{name:'Google로 계속하기'}));expect(press).not.toHaveBeenCalled();
  });
});
const base={visible:true,onToggleAge:vi.fn(),onToggleTerms:vi.fn(),onViewTerms:vi.fn(),onViewPrivacy:vi.fn(),onAgree:vi.fn(),onRequestClose:vi.fn()};
describe('새 계정 동의 시트 (2026-10-21 시안 a)',()=>{
  it('제목은 처음 오셨네요',()=>{
    render(<ConsentSheet {...base} ageChecked={false} termsChecked={false}/>);
    expect(screen.getByRole('heading',{name:'처음 오셨네요'})).toBeTruthy();
    expect(screen.getByText('계정을 만들려면 아래 내용을 확인하고 동의해 주세요.')).toBeTruthy();
  });
  it('두 체크가 모두 켜지기 전에는 동의하고 시작하기를 누를 수 없다',()=>{
    const agree=vi.fn();
    const {rerender}=render(<ConsentSheet {...base} onAgree={agree} ageChecked termsChecked={false}/>);
    fireEvent.click(screen.getByRole('button',{name:'동의하고 시작하기'}));expect(agree).not.toHaveBeenCalled();
    rerender(<ConsentSheet {...base} onAgree={agree} ageChecked termsChecked/>);
    fireEvent.click(screen.getByRole('button',{name:'동의하고 시작하기'}));expect(agree).toHaveBeenCalled();
  });
  it('체크와 보기를 전달한다',()=>{
    render(<ConsentSheet {...base} ageChecked={false} termsChecked={false}/>);
    fireEvent.click(screen.getByRole('checkbox',{name:'[필수] 만 14세 이상이에요'}));expect(base.onToggleAge).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('checkbox',{name:'[필수] 이용약관에 동의해요'}));expect(base.onToggleTerms).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button',{name:'이용약관 보기'}));expect(base.onViewTerms).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button',{name:'개인정보 처리방침 보기'}));expect(base.onViewPrivacy).toHaveBeenCalled();
  });
  it('이용약관은 체크 행에 보기가 붙어 한 번만 나온다 (2026-10-01 2안)',()=>{
    render(<ConsentSheet {...base} ageChecked={false} termsChecked={false}/>);
    expect(screen.queryByRole('button',{name:'이용약관'})).toBeNull();
    expect(screen.getAllByText(/이용약관/)).toHaveLength(1);
  });
  it('만 14세 미만 링크는 두지 않는다 (2026-10-21)',()=>{
    render(<ConsentSheet {...base} ageChecked={false} termsChecked={false}/>);
    expect(screen.queryByText('만 14세 미만이에요')).toBeNull();
  });
});
describe('계정으로 시작하기 화면 (2026-10-21)',()=>{
  it('첫 실행: 판 안에 로그인 버튼, 아래에 로그인 없이 시작하기. 체크는 없다',()=>{
    const local=vi.fn();
    render(<AccountLoginScreen loginButtons={<button>Apple로 로그인</button>} onLocal={local}/>);
    expect(screen.getByText('계정으로 시작하기')).toBeTruthy();
    expect(screen.getByRole('button',{name:'Apple로 로그인'})).toBeTruthy();
    expect(screen.queryByRole('checkbox')).toBeNull();
    expect(screen.queryByRole('button',{name:'뒤로'})).toBeNull();
    fireEvent.click(screen.getByRole('button',{name:'로그인 없이 시작하기'}));expect(local).toHaveBeenCalled();
  });
  it('로그인 중에는 로그인 없이 시작하기를 누를 수 없다',()=>{
    const local=vi.fn();
    render(<AccountLoginScreen loginButtons={null} onLocal={local} busy/>);
    fireEvent.click(screen.getByRole('button',{name:'로그인 없이 시작하기'}));expect(local).not.toHaveBeenCalled();
  });
  it('앱 설정에서 오면 뒤로 버튼이 있고 로그인 없이 시작하기는 없다',()=>{
    const back=vi.fn();
    render(<AccountLoginScreen loginButtons={null} onBack={back}/>);
    expect(screen.queryByRole('button',{name:'로그인 없이 시작하기'})).toBeNull();
    fireEvent.click(screen.getByRole('button',{name:'뒤로'}));expect(back).toHaveBeenCalled();
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
