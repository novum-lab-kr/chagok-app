import React from 'react';
import {afterEach,describe,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {PolicyListScreen,LicenseDetailScreen} from './policy-screens';
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
