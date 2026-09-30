import React from 'react';
import {PixelPanel,PixelText} from './components';
import {RetroScreen,ScreenHeader,SettingRow} from './composition-controls';

type LicenseRow={id:string;name:string;license:string};

/** 앱 설정 → 약관과 라이선스 (PRD 4.9, 시안 `약관과-라이선스-목록`). 약관·처리방침은 웹 시트로 연다. */
export function PolicyListScreen({onBack,onTerms,onPrivacy,licenses,onLicense}:{onBack:()=>void;onTerms:()=>void;onPrivacy:()=>void;licenses:readonly LicenseRow[];onLicense:(id:string)=>void}) {
  return <RetroScreen style={{gap:16}} header={<ScreenHeader title="약관과 라이선스" onBack={onBack}/>}>
    <PixelPanel title="약관">
      <SettingRow label="이용약관" onPress={onTerms}/>
      <SettingRow label="개인정보 처리방침" onPress={onPrivacy}/>
    </PixelPanel>
    <PixelPanel title="오픈소스 라이선스">
      {licenses.map((l)=><SettingRow key={l.id} label={l.name} value={l.license} onPress={()=>onLicense(l.id)}/>)}
    </PixelPanel>
  </RetroScreen>;
}

/** 라이선스 상세 (시안 `라이선스-상세`). 본문이 없으면 라이선스 이름만 보여준다. */
export function LicenseDetailScreen({name,license,text,onBack}:{name:string;license:string;text?:string;onBack:()=>void}) {
  return <RetroScreen style={{gap:16}} header={<ScreenHeader title="오픈소스 라이선스" onBack={onBack}/>}>
    <PixelPanel>
      <PixelText variant="title">{name}</PixelText>
      <PixelText>{license}</PixelText>
    </PixelPanel>
    {/* 화면 스크롤 하나로 읽는다. 안에 ScrollView를 또 두면 스크롤이 두 겹이 된다(2026-09-30 실기기). */}
    {text&&<PixelText style={{fontSize:13,lineHeight:20}}>{text}</PixelText>}
  </RetroScreen>;
}
