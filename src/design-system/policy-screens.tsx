import React,{useState} from 'react';
import {Pressable,View} from 'react-native';
import {retro} from './tokens';
import {PixelButton,PixelPanel,PixelText} from './components';
import {InfoRow,PixelBottomSheet,RetroScreen,ScreenHeader,SettingRow} from './composition-controls';

type LicenseRow={id:string;name:string;license:string};

/**
 * 앱 설정 「도움말과 정보」 (PRD 4.9, 2026-10-28 시안 2판 A). 예전 「도움말」과 「정보」 두 구역을 합쳤다.
 * 「광고 신고하기」(심사 지침 2.5.18)는 광고 제거를 산 사람에게는 광고가 없어 숨긴다.
 */
export function HelpInfoPanel({adFree,version,onTutorial,onContact,onReportAd,onPolicies,onSendInfo}:{adFree:boolean;/** 앱 버전(예 `1.0.0`). 모르면 줄을 뺀다 */version?:string|null;onTutorial:()=>void;onContact:()=>void;onReportAd:()=>void;onPolicies:()=>void;onSendInfo:()=>void}) {
  return <PixelPanel title="도움말과 정보">
    <SettingRow label="사용법 다시 보기" onPress={onTutorial}/>
    <SettingRow label="문의하기" onPress={onContact}/>
    {!adFree&&<SettingRow label="광고 신고하기" onPress={onReportAd}/>}
    <SettingRow label="약관과 라이선스" onPress={onPolicies}/>
    <SettingRow label="보내는 정보" onPress={onSendInfo}/>
    {version&&<InfoRow label="앱 버전" value={version}/>}
  </PixelPanel>;
}

/** 체크 상자가 오른쪽 끝에 있는 줄. SettingRow와 같은 높이와 글자 자리. */
function CheckRow({label,checked,onChange}:{label:string;checked:boolean;onChange:()=>void}) {
  return <Pressable accessibilityRole="checkbox" accessibilityLabel={label} accessibilityState={{checked}} aria-checked={checked} onPress={onChange} style={{minHeight:56,flexDirection:'row',alignItems:'center',gap:8}}>
    <PixelText style={{flex:1}}>{label}</PixelText>
    <View style={{width:24,height:24,borderWidth:retro.shape.border,borderColor:retro.color.ink,backgroundColor:retro.color.lcd,padding:4}}>
      {checked&&<View style={{flex:1,backgroundColor:retro.color.ink}}/>}
    </View>
  </Pressable>;
}

/** 앱 설정 → 보내는 정보 (PRD 8.2, 2026-11-01 시안 3판). */
export function SendInfoScreen({analyticsEnabled,errorReportEnabled,onBack,onToggleAnalytics,onToggleErrorReport}:{analyticsEnabled:boolean;errorReportEnabled:boolean;onBack:()=>void;onToggleAnalytics:()=>void;onToggleErrorReport:()=>void}) {
  return <RetroScreen style={{gap:16}} header={<ScreenHeader title="보내는 정보" onBack={onBack}/>}>
    <PixelPanel>
      <CheckRow label="사용 기록 보내기" checked={analyticsEnabled} onChange={onToggleAnalytics}/>
      <CheckRow label="오류 보고 보내기" checked={errorReportEnabled} onChange={onToggleErrorReport}/>
    </PixelPanel>
    <PixelText>꺼도 앱 기능은 그대로예요.</PixelText>
  </RetroScreen>;
}

const ANALYTICS_CONSENT_ROWS:readonly (readonly [string,string])[]=[
  ['보내는 것','쓴 기능과 이동한 화면, 설치 ID, 로그인하면 계정 ID, 기기와 앱 정보'],
  ['받는 곳','PostHog Inc. (privacy@posthog.com)'],
  ['나라','독일'],
  ['보내는 때','앱을 쓰는 동안 암호화해서 보내요'],
  ['쓰는 곳, 기간','앱 개선, 1년 보관'],
  ['거부하면','보내지 않아요. 앱 기능은 그대로예요'],
];

/**
 * 사용 기록 보내기 동의 (PRD 8.2, 2026-11-01 시안 A 3판). 앱에서 스티커를 처음 붙인 뒤와 설정에서 켤 때 쓴다.
 * 버튼으로 동의를 표시한다(시행령 제17조 2항 4호). 나라와 받는 회사, 만 14세는 펼치지 않아도 보이게 둔다(제17조 1항 2호, 법 제22조의2).
 */
export function AnalyticsConsentSheet({visible,onAgree,onDecline}:{visible:boolean;onAgree:()=>void;onDecline:()=>void}) {
  return <PixelBottomSheet visible={visible} title="앱 개선을 도와주세요" onRequestClose={onDecline}>
    {visible&&<AnalyticsConsentBody onAgree={onAgree} onDecline={onDecline}/>}
  </PixelBottomSheet>;
}

/** 시트가 닫히면 사라져서, 다시 열 때 항상 접힌 글부터 보인다. */
function AnalyticsConsentBody({onAgree,onDecline}:{onAgree:()=>void;onDecline:()=>void}) {
  const [open,setOpen]=useState(false);
  return <>
    {open
      ?<View style={{gap:6}}>{ANALYTICS_CONSENT_ROWS.map(([label,value])=><View key={label} style={{flexDirection:'row',gap:10}}>
        <PixelText style={{width:84,color:retro.color.ink,opacity:0.7}}>{label}</PixelText>
        <PixelText style={{flex:1}}>{value}</PixelText>
      </View>)}</View>
      :<View style={{gap:8}}>
        <PixelText>어떤 기능을 쓰는지 기록을 독일에 있는 PostHog로 보내 앱을 고치는 데 써요.</PixelText>
        <PixelText>목표 이름, 메모, 사진은 보내지 않아요.</PixelText>
        <PixelText>만 14세 미만이면 동의 안 함을 눌러 주세요.</PixelText>
      </View>}
    <SettingRow label={open?'접기':'자세히 보기'} onPress={()=>setOpen(!open)}/>
    <View style={{flexDirection:'row',gap:10}}>
      <PixelButton style={{flex:1}} variant="secondary" label="동의 안 함" onPress={onDecline}/>
      <PixelButton style={{flex:1}} variant="secondary" label="동의해요" onPress={onAgree}/>
    </View>
  </>;
}

/** 문의하기와 광고 신고하기에서 메일 앱을 열지 못했을 때 (2026-10-28 시안). [주소 복사하기]는 받는 곳을 복사한다. */
export const contactDialogs={
  noMail:(email:string)=>({title:'메일 앱을 열지 못했어요',description:`아래 주소로 메일을 보내 주세요.\n${email}`,primaryLabel:'주소 복사하기',secondaryLabel:'닫기'}),
};

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
