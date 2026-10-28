import React from 'react';
import {afterEach,describe,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {HelpInfoPanel,PolicyListScreen,LicenseDetailScreen} from './policy-screens';
afterEach(cleanup);
describe('약관과 라이선스',()=>{
  it('세 항목을 누르면 각각 전달한다',()=>{
    const p={onBack:vi.fn(),onTerms:vi.fn(),onPrivacy:vi.fn(),licenses:[{id:'neodgm',name:'Neo둥근모',license:'SIL Open Font License 1.1'}],onLicense:vi.fn()};
    render(<PolicyListScreen {...p}/>);
    fireEvent.click(screen.getByRole('button',{name:'이용약관'}));expect(p.onTerms).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button',{name:'개인정보 처리방침'}));expect(p.onPrivacy).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button',{name:'Neo둥근모, SIL Open Font License 1.1'}));expect(p.onLicense).toHaveBeenCalledWith('neodgm');
  });
  it('라이선스 상세는 이름·라이선스·본문을 보여준다',()=>{
    render(<LicenseDetailScreen name="Neo둥근모" license="SIL Open Font License 1.1" text="Copyright ..." onBack={()=>{}}/>);
    expect(screen.getByText('Neo둥근모')).toBeTruthy();
    expect(screen.getByText('Copyright ...')).toBeTruthy();
  });
});
describe('도움말과 정보',()=>{
  const handlers=()=>({onTutorial:vi.fn(),onContact:vi.fn(),onReportAd:vi.fn(),onPolicies:vi.fn()});
  it('네 줄을 누르면 각각 전달하고 앱 버전을 보여준다',()=>{
    const p=handlers();
    render(<HelpInfoPanel adFree={false} version="1.0.0" {...p}/>);
    fireEvent.click(screen.getByRole('button',{name:'사용법 다시 보기'}));expect(p.onTutorial).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button',{name:'문의하기'}));expect(p.onContact).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button',{name:'광고 신고하기'}));expect(p.onReportAd).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button',{name:'약관과 라이선스'}));expect(p.onPolicies).toHaveBeenCalled();
    expect(screen.getByText('도움말과 정보')).toBeTruthy();
    expect(screen.getByText('1.0.0')).toBeTruthy();
  });
  it('광고 제거를 샀으면 광고 신고하기를 숨기고, 버전을 모르면 버전 줄을 뺀다',()=>{
    render(<HelpInfoPanel adFree version={null} {...handlers()}/>);
    expect(screen.queryByRole('button',{name:'광고 신고하기'})).toBeNull();
    expect(screen.queryByText('앱 버전')).toBeNull();
  });
});
