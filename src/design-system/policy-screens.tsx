import React from 'react';
import {PixelPanel,PixelText} from './components';
import {InfoRow,RetroScreen,ScreenHeader,SettingRow} from './composition-controls';
import {t} from '../i18n';

type LicenseRow={id:string;name:string;license:string};

/**
 * 앱 설정 「도움말과 정보」 (PRD 4.9, 2026-10-28 시안 2판 A). 예전 「도움말」과 「정보」 두 구역을 합쳤다.
 * 「광고 신고하기」(심사 지침 2.5.18)는 광고 제거를 산 사람에게는 광고가 없어 숨긴다.
 */
export function HelpInfoPanel({adFree,version,onTutorial,onContact,onReportAd,onPolicies}:{adFree:boolean;/** 앱 버전(예 `1.0.0`). 모르면 줄을 뺀다 */version?:string|null;onTutorial:()=>void;onContact:()=>void;onReportAd:()=>void;onPolicies:()=>void}) {
  return <PixelPanel title={t('help.title')}>
    <SettingRow label={t('help.tutorial')} onPress={onTutorial}/>
    <SettingRow label={t('help.contact')} onPress={onContact}/>
    {!adFree&&<SettingRow label={t('help.reportAd')} onPress={onReportAd}/>}
    <SettingRow label={t('policy.title')} onPress={onPolicies}/>
    {version&&<InfoRow label={t('help.version')} value={version}/>}
  </PixelPanel>;
}

/** 문의하기와 광고 신고하기에서 메일 앱을 열지 못했을 때 (2026-10-28 시안). [주소 복사하기]는 받는 곳을 복사한다. */
export const contactDialogs={
  noMail:(email:string)=>({title:t('contact.noMailTitle'),description:t('contact.noMailDescription',email),primaryLabel:t('contact.copyAddress'),secondaryLabel:t('common.close')}),
};

/** 앱 설정 → 약관과 라이선스 (PRD 4.9, 시안 `약관과-라이선스-목록`). 약관·처리방침은 웹 시트로 연다. */
export function PolicyListScreen({onBack,onTerms,onPrivacy,licenses,onLicense}:{onBack:()=>void;onTerms:()=>void;onPrivacy:()=>void;licenses:readonly LicenseRow[];onLicense:(id:string)=>void}) {
  return <RetroScreen style={{gap:16}} header={<ScreenHeader title={t('policy.title')} onBack={onBack}/>}>
    <PixelPanel title={t('policy.termsSection')}>
      <SettingRow label={t('policy.terms')} onPress={onTerms}/>
      <SettingRow label={t('policy.privacy')} onPress={onPrivacy}/>
    </PixelPanel>
    <PixelPanel title={t('policy.licenses')}>
      {licenses.map((l)=><SettingRow key={l.id} label={l.name} value={l.license} onPress={()=>onLicense(l.id)}/>)}
    </PixelPanel>
  </RetroScreen>;
}

/** 라이선스 상세 (시안 `라이선스-상세`). 본문이 없으면 라이선스 이름만 보여준다. */
export function LicenseDetailScreen({name,license,text,onBack}:{name:string;license:string;text?:string;onBack:()=>void}) {
  return <RetroScreen style={{gap:16}} header={<ScreenHeader title={t('policy.licenses')} onBack={onBack}/>}>
    <PixelPanel>
      <PixelText variant="title">{name}</PixelText>
      <PixelText>{license}</PixelText>
    </PixelPanel>
    {/* 화면 스크롤 하나로 읽는다. 안에 ScrollView를 또 두면 스크롤이 두 겹이 된다(2026-09-30 실기기). */}
    {text&&<PixelText style={{fontSize:13,lineHeight:20}}>{text}</PixelText>}
  </RetroScreen>;
}
