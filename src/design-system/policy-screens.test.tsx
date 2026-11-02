import {setLanguage} from '../i18n';
import React from 'react';
import {afterEach,describe,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {AnalyticsConsentSheet,HelpInfoPanel,PolicyListScreen,LicenseDetailScreen,SendInfoScreen} from './policy-screens';
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
describe('보내는 정보',()=>{
  it('두 칸이 각자 상태를 보여주고 누르면 각자 전달한다',()=>{
    const onToggleAnalytics=vi.fn(),onToggleErrorReport=vi.fn();
    render(<SendInfoScreen onBack={()=>{}} analyticsEnabled={false} errorReportEnabled onToggleAnalytics={onToggleAnalytics} onToggleErrorReport={onToggleErrorReport}/>);
    const usage=screen.getByRole('checkbox',{name:'사용 기록 보내기'}),errors=screen.getByRole('checkbox',{name:'오류 보고 보내기'});
    expect(usage.getAttribute('aria-checked')).toBe('false');
    expect(errors.getAttribute('aria-checked')).toBe('true');
    fireEvent.click(usage);expect(onToggleAnalytics).toHaveBeenCalledTimes(1);expect(onToggleErrorReport).not.toHaveBeenCalled();
    fireEvent.click(errors);expect(onToggleErrorReport).toHaveBeenCalledTimes(1);
  });
});
describe('사용 기록 동의',()=>{
  const setup=()=>{
    const onAgree=vi.fn(),onDecline=vi.fn();
    render(<AnalyticsConsentSheet visible onAgree={onAgree} onDecline={onDecline}/>);
    return {onAgree,onDecline};
  };
  it('체크 없이 버튼으로 답한다',()=>{
    const {onAgree,onDecline}=setup();
    expect(screen.queryByRole('checkbox')).toBeNull();
    fireEvent.click(screen.getByRole('button',{name:'동의해요'}));expect(onAgree).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button',{name:'동의 안 함'}));expect(onDecline).toHaveBeenCalledTimes(1);
  });
  it('나라, 받는 회사, 만 14세는 펼치지 않아도 보인다',()=>{
    setup();
    expect(screen.getByText(/독일에 있는 PostHog/)).toBeTruthy();
    expect(screen.getByText(/만 14세 미만/)).toBeTruthy();
  });
  it('자세히 보기를 누르면 항목이 펼쳐지고 접기로 돌아간다',()=>{
    setup();
    fireEvent.click(screen.getByRole('button',{name:'자세히 보기'}));
    expect(screen.getByText('PostHog Inc. (privacy@posthog.com)')).toBeTruthy();
    fireEvent.click(screen.getByRole('button',{name:'접기'}));
    expect(screen.getByRole('button',{name:'자세히 보기'})).toBeTruthy();
  });
});
describe('사용 기록 동의 다시 열기',()=>{
  it('펼친 채 닫았어도 다시 열면 접힌 글부터 보인다',()=>{
    const p={onAgree:vi.fn(),onDecline:vi.fn()};
    const {rerender}=render(<AnalyticsConsentSheet visible {...p}/>);
    fireEvent.click(screen.getByRole('button',{name:'자세히 보기'}));
    rerender(<AnalyticsConsentSheet visible={false} {...p}/>);
    rerender(<AnalyticsConsentSheet visible {...p}/>);
    expect(screen.getByText(/만 14세 미만/)).toBeTruthy();
  });
});
describe('도움말과 정보',()=>{
  const handlers=()=>({onTutorial:vi.fn(),onContact:vi.fn(),onReportAd:vi.fn(),onPolicies:vi.fn(),onSendInfo:vi.fn()});
  it('네 줄을 누르면 각각 전달하고 앱 버전을 보여준다',()=>{
    const p=handlers();
    render(<HelpInfoPanel adFree={false} version="1.0.0" {...p}/>);
    fireEvent.click(screen.getByRole('button',{name:'사용법 다시 보기'}));expect(p.onTutorial).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button',{name:'문의하기'}));expect(p.onContact).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button',{name:'광고 신고하기'}));expect(p.onReportAd).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button',{name:'약관과 라이선스'}));expect(p.onPolicies).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button',{name:'보내는 정보'}));expect(p.onSendInfo).toHaveBeenCalled();
    expect(screen.getByText('도움말과 정보')).toBeTruthy();
    expect(screen.getByText('1.0.0')).toBeTruthy();
  });
  it('광고 제거를 샀으면 광고 신고하기를 숨기고, 버전을 모르면 버전 줄을 뺀다',()=>{
    render(<HelpInfoPanel adFree version={null} {...handlers()}/>);
    expect(screen.queryByRole('button',{name:'광고 신고하기'})).toBeNull();
    expect(screen.queryByText('앱 버전')).toBeNull();
  });
});

describe('사용 기록 동의 영어 문구',()=>{
  afterEach(()=>setLanguage('ko'));
  it('영어 기기에서 시트와 펼친 항목이 영어다',()=>{
    setLanguage('en');
    render(<AnalyticsConsentSheet visible onAgree={()=>{}} onDecline={()=>{}}/>);
    expect(screen.getByText(/PostHog in Germany/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button',{name:'See details'}));
    expect(screen.getByText('Germany')).toBeTruthy();
    expect(screen.getByRole('button',{name:'I agree'})).toBeTruthy();
  });
});
