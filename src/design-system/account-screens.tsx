import React,{type ReactNode} from 'react';
import {Image,Pressable,View} from 'react-native';
import Svg,{Path} from 'react-native-svg';
import {PixelButton,PixelIcon,PixelPanel,PixelText,useLayoutSize} from './components';
import {AppHeader,InfoRow,RetroScreen,ScreenHeader,SelectionBadge,SettingRow} from './composition-controls';
import {pixelOutline} from './geometry';
import {retro} from './tokens';
import {APPLE_LOGO_PNG} from './apple-logo';

/**
 * 계정 흐름의 다이얼로그 문구 (2026-10-01 확정 시안). 화면 위에 PixelDialogModal·PixelBusyModal로 띄운다.
 * 문구는 시스템 상태가 아니라 사용자가 할 수 있는 일로 쓴다.
 */
export const accountDialogs={
  /** 로그인이 풀렸을 때 앱을 열면 한 번 묻는다. 그 뒤로는 앱 설정의 계정 칸이 안내한다. */
  session:{title:'로그인이 필요해요',description:'다시 로그인해 주세요. 로그인하기 전까지 기록은 이 기기에만 저장돼요. 나중에 설정 탭에서 로그인해도 돼요.',primaryLabel:'로그인',secondaryLabel:'나중에'},
  restoring:{title:'기록을 가져오는 중',description:'앱을 닫지 말고 잠시 기다려 주세요.'},
  restoreFailed:{title:'가져오지 못했어요',description:'이 기기의 기록은 바뀌지 않았어요. 연결을 확인하고 다시 시도해 주세요.',primaryLabel:'다시 시도',secondaryLabel:'나중에'},
  /** 백업 중에는 loading으로 같은 다이얼로그를 둔다. */
  logout:{title:'로그아웃할까요?',description:'아직 백업하지 않은 기록을 먼저 백업하고, 이 기기의 기록을 지워요. 다시 로그인하면 가져올 수 있어요.',primaryLabel:'로그아웃',secondaryLabel:'취소'},
  logoutFailed:{title:'백업에 실패했어요',description:'인터넷 연결을 확인하고 다시 시도해 주세요.',primaryLabel:'다시 시도',secondaryLabel:'닫기'},
  /** 서버가 받지 않는 기록(보류)이 남았을 때. */
  logoutHeld:(count:number)=>({title:`기록 ${count}개가 사라져요`,description:'이 기록은 백업할 수 없어요. 로그아웃하면 이 기기에서도 지워져요. 그래도 로그아웃할까요?',primaryLabel:'로그아웃',secondaryLabel:'취소'}),
  /** 삭제 중에는 loading으로 같은 다이얼로그를 둔다. */
  deleteAccount:{title:'계정을 삭제할까요?',description:'서버와 이 기기의 기록이 모두 지워지고 되돌릴 수 없어요.',primaryLabel:'삭제하기',secondaryLabel:'취소'},
  deleteFailed:{title:'삭제하지 못했어요',description:'연결을 확인하고 다시 시도해 주세요. 아무것도 지우지 않았어요.',primaryLabel:'다시 시도',secondaryLabel:'닫기'},
  /** 약관 개정: 게시일부터 시행일 사이에 한 번. 재동의 화면은 두지 않는다. */
  termsChanged:(effectiveLabel:string)=>({title:'이용약관이 바뀌어요',description:`${effectiveLabel}부터 새 약관이 적용돼요. 바뀐 내용은 약관 보기에서 확인해 주세요.`,primaryLabel:'확인',secondaryLabel:'약관 보기'}),
  /** 동의 화면의 "만 14세 미만이에요". 미만이라는 사실은 이 기기의 광고 아동 처리에만 쓴다(서버로 보내지 않는다, 2026-10-13). */
  under14:{title:'계정은 만 14세부터 연결할 수 있어요',description:'이 기기에서는 지금처럼 모든 기능을 쓸 수 있어요. 다만 기기를 바꾸면 기록을 옮길 수 없어요.',primaryLabel:'확인',single:true},
} as const;

function Caption({children}:{children:ReactNode}) {
  return <PixelText variant="caption" style={{color:retro.color.buttonText}}>{children}</PixelText>;
}
function Heading({children}:{children:ReactNode}) {
  return <PixelText variant="title" style={{fontSize:24,lineHeight:32}}>{children}</PixelText>;
}
function Rule() {
  return <View style={{borderTopWidth:retro.shape.cellBorder,borderColor:retro.color.ink}}/>;
}

/** 판 종류 카드와 같은 선택 표시: 고르면 주황 외곽 + 안쪽 LCD, 제목 옆 체크 배지. */
function ChoiceCard({title,selected,onPress,children}:{title:string;selected:boolean;onPress:()=>void;children:ReactNode}) {
  const {ref,size,onLayout}=useLayoutSize();
  return <Pressable accessibilityRole="radio" accessibilityLabel={title} accessibilityState={{checked:selected}} aria-checked={selected} onPress={onPress}>
    <View ref={ref} onLayout={onLayout} style={{padding:16,gap:6}}>
      {size.width>0&&<Svg key={`${size.width}x${size.height}`} width={size.width} height={size.height} style={{position:'absolute',left:0,top:0}}>
        <Path d={pixelOutline(size.width,size.height,1.5,retro.shape.controlUnit)} fill={selected?retro.color.primary:retro.color.lcd} stroke={retro.color.ink} strokeWidth={retro.shape.border}/>
        {selected&&<Path d={pixelOutline(size.width,size.height,7.5,retro.shape.controlUnit)} fill={retro.color.lcd} stroke={retro.color.ink} strokeWidth={retro.shape.border}/>}
      </Svg>}
      <View style={{flexDirection:'row',alignItems:'center',gap:8}}>
        <PixelText style={{flex:1,fontSize:20,lineHeight:28}}>{title}</PixelText>
        {selected&&<SelectionBadge/>}
      </View>
      {children}
    </View>
  </Pressable>;
}

export type AccountStartChoice='account'|'local';
/** 첫 실행 시작 화면 (시안 1B). 하나를 고르고 [계속]. */
export function AccountStartScreen({value,onChange,onContinue}:{value:AccountStartChoice;onChange:(value:AccountStartChoice)=>void;onContinue:()=>void}) {
  return <RetroScreen scrollable={false} style={{gap:16,flex:1}}>
    <AppHeader/>
    <Heading>어떻게 시작할까요?</Heading>
    <View accessibilityRole="radiogroup" style={{gap:16}}>
      <ChoiceCard title="계정으로 시작하기" selected={value==='account'} onPress={()=>onChange('account')}>
        <Caption>기기를 바꾸거나 앱을 다시 깔아도 기록을 다시 가져와요.</Caption>
      </ChoiceCard>
      <ChoiceCard title="이 기기에서만 쓰기" selected={value==='local'} onPress={()=>onChange('local')}>
        <Caption>로그인 없이 바로 시작해요. 나중에 앱 설정에서 연결할 수 있어요.</Caption>
      </ChoiceCard>
    </View>
    <View style={{flex:1}}/>
    <PixelButton label="계속" onPress={onContinue}/>
  </RetroScreen>;
}

/** '개발'은 계정 준비 전 개발용 이메일 로그인 (2026-10-01). */
export type AccountProvider='Apple'|'Google'|'개발';
/**
 * 앱 설정의 「계정과 백업」 칸 (시안 2C). 계정 → 백업 상태 순, 배지 없이 문장으로.
 * - local: 계정 없음 · pending: 오프라인 등으로 못 올린 변경 · firstBackup: 첫 백업 중
 * - needsLogin: 로그인이 풀림 · restoring: 연결 직후 복원 중 (진행 다이얼로그가 위를 막는다)
 */
export type AccountBackupStatus=
  |{state:'local'}
  |{state:'synced';provider:AccountProvider;/** 예: '오늘 9:20' */backedUpAt:string}
  |{state:'pending'|'firstBackup'|'needsLogin'|'restoring';provider:AccountProvider};
const backupLines={
  pending:['백업하지 못한 기록이 있어요','연결되면 자동으로 백업해요'],
  firstBackup:['기록을 처음 백업하고 있어요','조금 걸릴 수 있어요. 앱은 그대로 써도 돼요'],
  needsLogin:['백업하려면 로그인이 필요해요','기록은 이 기기에 그대로 있어요'],
} as const;
export function AccountBackupPanel({status,onConnect,onLogin,onLogout,onDelete}:{status:AccountBackupStatus;onConnect:()=>void;onLogin:()=>void;onLogout:()=>void;onDelete:()=>void}) {
  if(status.state==='local') return <PixelPanel title="계정과 백업" contentStyle={{gap:0}}>
    <View style={{paddingVertical:12}}><PixelText>지금은 이 기기에만 저장하고 있어요</PixelText></View>
    <View style={{paddingBottom:12}}><PixelButton label="계정 연결하기" onPress={onConnect}/></View>
  </PixelPanel>;
  const lines:readonly string[]|undefined=status.state==='synced'||status.state==='restoring'?undefined:backupLines[status.state];
  // 연결된 계정은 「항목 · 값」으로 보인다 (2026-10-08 스티커 화면 시안 확정)
  return <PixelPanel title="계정과 백업" contentStyle={{gap:0}}>
    <InfoRow label="연결한 계정" value={status.provider}/>
    {status.state==='synced'&&<><Rule/><InfoRow label="마지막 백업" value={status.backedUpAt}/></>}
    {lines&&<><Rule/><View style={{paddingVertical:12,gap:4}}><PixelText>{lines[0]}</PixelText>{lines[1]&&<Caption>{lines[1]}</Caption>}</View></>}
    {status.state==='needsLogin'&&<View style={{paddingBottom:12}}><PixelButton label="로그인" onPress={onLogin}/></View>}
    {status.state!=='restoring'&&<><Rule/><SettingRow label="로그아웃" onPress={onLogout}/><Rule/><SettingRow label="계정 삭제" onPress={onDelete}/></>}
  </PixelPanel>;
}

export type RecordSnapshot={goals:number;stickers:number;/** 목표 이름. 둘까지 보이고 나머지는 「외 N개」 */goalNames:readonly string[];/** 예: '9월 27일' */updatedAt:string};
export type RestoreSide='server'|'device';
function goalNamesLine(names:readonly string[]) {
  return names.length>2?`${names.slice(0,2).join(', ')} 외 ${names.length-2}개`:names.join(', ');
}
/** 서버 백업과 이 기기 기록이 다를 때 하나를 고른다 (시안 3B). 안내는 제목 아래. */
export function RestoreConflictScreen({value,onChange,server,device,onConfirm,onBack}:{value:RestoreSide;onChange:(value:RestoreSide)=>void;server:RecordSnapshot;device:RecordSnapshot;onConfirm:()=>void;onBack:()=>void}) {
  const card=(side:RestoreSide,title:string,s:RecordSnapshot)=><ChoiceCard title={title} selected={value===side} onPress={()=>onChange(side)}>
    <PixelText style={{fontSize:15,lineHeight:22}}>{`목표 ${s.goals}개 · 스티커 ${s.stickers}개`}</PixelText>
    {s.goalNames.length>0&&<Caption>{goalNamesLine(s.goalNames)}</Caption>}
    <Caption>{`마지막 수정 ${s.updatedAt}`}</Caption>
  </ChoiceCard>;
  return <RetroScreen style={{gap:16}} header={<ScreenHeader title="기록 복원" onBack={onBack}/>}>
    <View style={{gap:8}}>
      <Heading>어느 기록을 사용할까요?</Heading>
      <PixelText>고른 기록으로 이 기기와 서버를 맞춰요. 다른 쪽 기록은 고른 기록으로 바뀌어요.</PixelText>
    </View>
    <View accessibilityRole="radiogroup" style={{gap:16}}>
      {card('server','서버 백업',server)}
      {card('device','이 기기 기록',device)}
    </View>
    <PixelButton label={value==='server'?'서버 백업 사용하기':'이 기기 기록 사용하기'} onPress={onConfirm}/>
  </RetroScreen>;
}

/** 계정 삭제 내용 확인 (시안 6A). [계정 삭제하기]를 누르면 최종 확인 다이얼로그(accountDialogs.deleteAccount). */
export function DeleteAccountScreen({onDelete,onCancel,onBack}:{onDelete:()=>void;onCancel:()=>void;onBack:()=>void}) {
  return <RetroScreen scrollable={false} style={{gap:16,flex:1}} header={<ScreenHeader title="계정 삭제" onBack={onBack}/>}>
    <PixelPanel contentStyle={{gap:8}}>
      <PixelText variant="title" style={{fontSize:20,lineHeight:28}}>계정과 기록이 사라져요</PixelText>
      <PixelText>서버에 저장된 목표, 스티커, 메모, 사진과 계정을 삭제해요. 이 기기의 기록도 모두 지워져요. 되돌릴 수 없어요.</PixelText>
    </PixelPanel>
    <View style={{flex:1}}/>
    <PixelButton label="계정 삭제하기" onPress={onDelete}/>
    <PixelButton label="취소" variant="secondary" onPress={onCancel}/>
  </RetroScreen>;
}

/** 삭제 완료. 뒤로 갈 곳이 없으므로 뒤로가기 없이 [처음으로]만. */
export function AccountDeletedScreen({onDone}:{onDone:()=>void}) {
  return <RetroScreen scrollable={false} style={{gap:16,flex:1}} header={<ScreenHeader title="계정 삭제"/>}>
    <PixelPanel contentStyle={{gap:8}}>
      <PixelText variant="title" style={{fontSize:20,lineHeight:28}}>계정을 삭제했어요</PixelText>
      <PixelText>서버와 이 기기의 기록을 모두 지웠어요. 처음 화면으로 돌아가요.</PixelText>
    </PixelPanel>
    <View style={{flex:1}}/>
    <PixelButton label="처음으로" onPress={onDone}/>
  </RetroScreen>;
}

/** 체크 상자. 픽셀 프레임은 작은 크기에서 모서리가 깎여 +로 보이므로 잉크 테두리 네모로 그린다. 체크하면 안을 채운다. */
export function PixelCheckbox({label,checked,onChange}:{label:string;checked:boolean;onChange:()=>void}) {
  return <Pressable accessibilityRole="checkbox" accessibilityLabel={label} accessibilityState={{checked}} aria-checked={checked} onPress={onChange} style={{minHeight:retro.layout.touch,flexDirection:'row',alignItems:'center',gap:10}}>
    <View style={{width:24,height:24,borderWidth:retro.shape.border,borderColor:retro.color.ink,backgroundColor:retro.color.lcd,padding:4}}>
      {checked&&<View style={{flex:1,backgroundColor:retro.color.ink}}/>}
    </View>
    <PixelText style={{flex:1}}>{label}</PixelText>
  </Pressable>;
}

/** 동의 행 오른쪽의 보기(>). 행 높이만큼 눌리고, 체크와 따로 누른다. */
function ViewChevron({label,onPress}:{label:string;onPress:()=>void}) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={{minHeight:retro.layout.touch,minWidth:28,alignItems:'flex-end',justifyContent:'center'}}>
    <PixelIcon name="chevron" size={14}/>
  </Pressable>;
}

export type LoginProvider='kakao'|'apple'|'google';
const PROVIDER_NAME:Record<LoginProvider,string>={kakao:'카카오',apple:'Apple',google:'Google'};
const LOGIN_LABEL:Record<LoginProvider,string>={kakao:'카카오로 로그인',apple:'Apple로 로그인',google:'Google로 로그인'};
const CIRCLE=52,LOGO=24;
// 세 원 모두 줄 없음 (2026-10-16 테두리 시안 3안). Google은 줄 없는 neutral 바탕 #F2F2F2만 가이드에 있어 흰색 대신 쓴다.
const CIRCLE_FILL:Record<LoginProvider,string>={kakao:'#FEE500',apple:'#FFFFFF',google:'#F2F2F2'};
// 카카오 말풍선: 카카오 리소스(login-complete-ko.svg) 모양 그대로. 색·모양을 바꾸지 않는다.
const KAKAO_SYMBOL='M6.4785 0C2.8997 0 0 2.4812 0 5.5416C0 7.5087 1.1994 9.2371 3.0067 10.2198L2.3956 12.6888C2.3729 12.7625 2.3907 12.8415 2.4394 12.8959C2.475 12.9345 2.5236 12.9555 2.5706 12.9555C2.6112 12.9555 2.6517 12.9415 2.6857 12.9116L5.3115 10.9919C5.6892 11.0498 6.0782 11.0814 6.4769 11.0814C10.0542 11.0814 12.9555 8.6001 12.9555 5.5398C12.9555 2.4795 10.0558 0 6.4785 0Z';
// Google G: Google 로그인 버튼의 네 색 로고 그대로(단색 금지).
const GOOGLE_G:[string,string][]=[
  ['#EA4335','M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z'],
  ['#4285F4','M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z'],
  ['#FBBC05','M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z'],
  ['#34A853','M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z'],
];
function LoginLogo({provider}:{provider:LoginProvider}) {
  if(provider==='kakao') return <Svg width={LOGO} height={LOGO} viewBox="0 0 12.956 12.956"><Path d={KAKAO_SYMBOL} fill="#000000"/></Svg>;
  // Apple: 공식 로고 버튼 그림(흰 둥근 사각형 + 로고)을 원 크기 그대로 깔고, 원이 모서리를 잘라 낸다(overflow hidden).
  // 로고 크기와 위치는 그림 안의 Apple 여백이 정한다. 로고만 있는 버튼은 모양을 씌워 써도 된다(HIG).
  if(provider==='apple') return <Image source={{uri:APPLE_LOGO_PNG}} style={{width:CIRCLE,height:CIRCLE}} accessibilityIgnoresInvertColors/>;
  return <Svg width={LOGO*0.9} height={LOGO*0.9} viewBox="0 0 48 48">{GOOGLE_G.map(([fill,d])=><Path key={fill} d={d} fill={fill}/>)}</Svg>;
}
/**
 * 로그인 버튼: 지름 52 동그라미 안에 회사 로고만 (2026-10-15 시안 틀4).
 * 각 회사의 색은 디자인 시스템의 예외다 — 카카오는 노란 원 #FEE500(가이드상 바꿀 수 없음), Apple은 흰 원, Google은 연회색 원 #F2F2F2이고 셋 다 줄이 없다(2026-10-16 테두리 시안 3안).
 * 카카오는 가이드 본문에 아이콘만 쓰는 형태가 없지만, 데브톡 답변(2021-06-08)이 「타사 아이콘과 비율 차이 없다면」 허용한다 — 세 원의 크기·로고 크기를 같게 둔다.
 * 글자 없이 원만 둔다 — 화면 제목 「시작하기」와 소개 문구가 버튼 뜻을 알린다(2026-10-15, 「간편 로그인」 문구는 뺐다). 순서는 부르는 쪽이 정한다(카카오 → Apple → Google).
 */
export function LoginCircles({providers,onPress}:{providers:LoginProvider[];onPress:(provider:LoginProvider)=>void}) {
  return <View style={{alignItems:'center'}}>
    <View style={{flexDirection:'row',gap:20}}>
      {providers.map((p)=><Pressable key={p} accessibilityRole="button" accessibilityLabel={LOGIN_LABEL[p]} onPress={()=>onPress(p)}
        style={({pressed})=>({width:CIRCLE,height:CIRCLE,borderRadius:CIRCLE/2,backgroundColor:CIRCLE_FILL[p],alignItems:'center',justifyContent:'center',overflow:'hidden',opacity:pressed?0.7:1})}>
        <LoginLogo provider={p}/>
      </Pressable>)}
    </View>
  </View>;
}

/**
 * 계정 연결 직전 한 화면 (약관 설계, 2026-10-01 시안 2안). 두 필수 체크가 켜져야 로그인 버튼을 누를 수 있다.
 * 판 없이 위아래 선으로 동의 목록을 묶고 버튼을 바로 아래 잇는다.
 * 처음 누르면 계정이 만들어지고 이미 있으면 로그인돼서, 두 일을 묶어 제목을 「시작하기」로 쓴다(2026-10-15 시안 2안). 소개에 쓸 수 있는 계정을 적는다.
 * 로그인 버튼은 슬롯으로 받는다 — 앱은 LoginCircles를, 개발 빌드는 개발 계정 버튼을 더 넣는다.
 */
export function ConsentScreen({ageChecked,termsChecked,onToggleAge,onToggleTerms,onViewTerms,onViewPrivacy,onUnder14,onBack,loginButtons,providers}:{providers:LoginProvider[];ageChecked:boolean;termsChecked:boolean;onToggleAge:()=>void;onToggleTerms:()=>void;onViewTerms:()=>void;onViewPrivacy:()=>void;onUnder14:()=>void;onBack:()=>void;loginButtons:ReactNode}) {
  const enabled=ageChecked&&termsChecked;
  return <RetroScreen style={{gap:16}} header={<ScreenHeader title="시작하기" onBack={onBack}/>}>
    <PixelText>{providers.map((p)=>PROVIDER_NAME[p]).join(', ')} 계정으로 시작하면 기록이 백업되고, 새 기기에서 다시 가져올 수 있어요.</PixelText>
    {/* 체크와 보기를 한 행에 둬 이용약관이 한 번만 나온다. 처리방침은 동의가 아니라 안내라 체크 없이 행 전체가 보기다. */}
    <View>
      <Rule/>
      <View style={{paddingVertical:4}}>
        <PixelCheckbox label="[필수] 만 14세 이상이에요" checked={ageChecked} onChange={onToggleAge}/>
        <View style={{flexDirection:'row',alignItems:'center'}}>
          <View style={{flex:1}}><PixelCheckbox label="[필수] 이용약관에 동의해요" checked={termsChecked} onChange={onToggleTerms}/></View>
          <ViewChevron label="이용약관 보기" onPress={onViewTerms}/>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="개인정보 처리방침 보기" onPress={onViewPrivacy} style={{minHeight:retro.layout.touch,flexDirection:'row',alignItems:'center',paddingLeft:34}}>
          <PixelText style={{flex:1}}>개인정보 처리방침</PixelText>
          <PixelIcon name="chevron" size={14}/>
        </Pressable>
      </View>
      <Rule/>
    </View>
    <View testID="login-area" aria-disabled={!enabled} pointerEvents={enabled?'auto':'none'} style={{gap:12,marginTop:4,opacity:enabled?1:retro.opacity.disabled}}>
      {loginButtons}
    </View>
    {/* 글자만 있으면 누를 수 있는지 모른다(2026-10-01 사용자). 기록 화면의 TextAction은 아이콘이 있어 그대로 두고 여기만 밑줄. */}
    <Pressable accessibilityRole="button" accessibilityLabel="만 14세 미만이에요" onPress={onUnder14} style={{minHeight:retro.layout.touch,alignItems:'center',justifyContent:'center'}}>
      <PixelText style={{textDecorationLine:'underline'}}>만 14세 미만이에요</PixelText>
    </Pressable>
  </RetroScreen>;
}
