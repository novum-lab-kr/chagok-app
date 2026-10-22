import React,{type ReactNode} from 'react';
import {Pressable,Text,View} from 'react-native';
import Svg,{Path} from 'react-native-svg';
import {PixelButton,PixelIcon,PixelPanel,PixelText,useLayoutSize} from './components';
import {Mascot} from './mascot';
import {APPLE_SIWA_LOGO} from './apple-siwa-logo.generated';
import {InfoRow,PixelBottomSheet,RetroScreen,ScreenHeader,SelectionBadge,SettingRow} from './composition-controls';
import {pixelOutline} from './geometry';
import {retro} from './tokens';

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
  /** 새 계정 동의 시트를 동의 없이 닫을 때 (2026-10-21). 그만하면 방금 만든 계정을 서버에서 지운다. */
  quitSignup:{title:'가입을 그만할까요?',description:'방금 만든 계정은 지워져요. 로그인 없이 이 기기에서 쓸 수 있어요.',primaryLabel:'그만하기',secondaryLabel:'계속 가입하기'},
  quitFailed:{title:'계정을 지우지 못했어요',description:'인터넷 연결을 확인해 주세요. 다음에 로그인하면 동의를 다시 여쭤볼게요.',primaryLabel:'확인'},
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

/**
 * 계정으로 시작하는 화면 (2026-10-21 로그인 먼저 시안). 판 안에 로그인 버튼만 둔다 — 약관 동의는 로그인 뒤 처음 만든 계정에만 ConsentSheet로 받는다.
 * 첫 실행이면 앱 머리와 [로그인 없이 시작하기], 앱 설정에서 오면(onBack) 뒤로 버튼이 있는 머리다.
 * 로그인 버튼은 슬롯으로 받는다 — 앱은 Apple 기본 버튼을, 개발 빌드는 개발 계정 버튼을 더 넣는다.
 */
/**
 * 계정으로 시작하기 (2026-10-22 시안 3판 W2). 머리글 없이 판을 세로 가운데에 두고 그 위에 차곡이를 얹는다. [로그인 없이 시작하기]는 아래.
 * 앱 설정에서 오면 「계정 연결」 머리글이 있고 인사 제목은 뺀다. 안내는 고르기를 권하고 로그인의 덤(자동 백업)만 말한다. 기록이 사라질 수 있다는 걱정이나 새 기기로 옮기기를 앞세우지 않는다.
 */
export function AccountLoginScreen({loginButtons,onBack,onLocal,busy=false}:{loginButtons:ReactNode;/** 앱 설정에서 왔다 */onBack?:()=>void;/** 첫 실행: 로그인 없이 시작 */onLocal?:()=>void;/** 로그인 진행 중: 로그인 없이 시작을 막는다 */busy?:boolean}) {
  return <RetroScreen scrollable={false} style={{gap:16,flex:1}} header={onBack?<ScreenHeader title="계정 연결" onBack={onBack}/>:undefined}>
    <View style={{flex:1,justifyContent:'center'}}>
      <View style={{alignItems:'center',marginBottom:-22,zIndex:1}}><Mascot pose="grin" size={96}/></View>
      <PixelPanel contentStyle={{gap:20,paddingTop:36,paddingBottom:28}}>
        <View style={{gap:8,alignItems:'center'}}>
          {!onBack&&<PixelText variant="title" style={{fontSize:20,lineHeight:28,textAlign:'center'}}>반가워요</PixelText>}
          <PixelText variant="caption" style={{color:retro.color.buttonText,textAlign:'center',lineHeight:20}}>{'어떤 걸로 시작해 볼까요?\n로그인하면 기록을 자동으로 백업해요.'}</PixelText>
        </View>
        <View style={{gap:10}}>{loginButtons}</View>
      </PixelPanel>
    </View>
    {onLocal&&<PixelButton label="로그인 없이 시작하기" variant="secondary" disabled={busy} onPress={onLocal}/>}
  </RetroScreen>;
}

/**
 * 직접 만든 Apple 로그인 버튼 (HIG 「Creating a custom Sign in with Apple button」, 2026-10-22). 기본 버튼의 로고가 다른 회사 아이콘보다 작아서 만들었다.
 * - 로고: Apple 디자인 리소스 Left-aligned Black Medium. 파일 높이 = 버튼 높이, 자르지 않고 위아래 여백을 더하지 않는다. 사과 높이가 약 17로 카카오(18), Google(20)과 맞는다.
 * - 글자: 시스템 글꼴, 높이의 43%(40이면 17.2), 검정. 바탕 흰색, 테두리 검정, 모서리는 다른 버튼과 같은 12.
 * - 로고 파일은 사용권상 공개 저장소에 두지 않는다(scripts/apple-logo.mjs). 파일이 없으면 null이고 호스트가 Apple 기본 버튼을 쓴다.
 */
export const hasCustomAppleButton=APPLE_SIWA_LOGO!==null;
export function AppleLoginButton({onPress,disabled=false,logo=APPLE_SIWA_LOGO}:{onPress:()=>void;disabled?:boolean;/** 테스트에서 바꿔 넣는다 */logo?:{width:number;height:number;d:string}|null}) {
  if(!logo) return null;
  const h=LOGIN_BUTTON_HEIGHT;
  return <Pressable accessibilityRole="button" accessibilityLabel="Apple로 계속하기" aria-disabled={disabled} accessibilityState={{disabled}} disabled={disabled} onPress={onPress}
    hitSlop={loginHitSlop} style={({pressed})=>({height:h,borderRadius:12,borderWidth:1,borderColor:'#000000',backgroundColor:'#FFFFFF',flexDirection:'row',alignItems:'center',justifyContent:'center',opacity:pressed?0.8:1})}>
    <Svg width={logo.width*h/logo.height} height={h} viewBox={`0 0 ${logo.width} ${logo.height}`} accessibilityElementsHidden importantForAccessibility="no">
      <Path fill="#000000" d={logo.d}/>
    </Svg>
    <Text style={{fontSize:h*0.43,fontWeight:'500',color:'#000000'}}>Apple로 계속하기</Text>
  </Pressable>;
}

/** 로그인 버튼 높이 40(2026-10-22 시안 T3). Apple 기본 버튼은 글자가 높이의 43%라 40이면 17로 세 버튼 글자가 맞는다. 누르는 영역은 44를 지킨다. */
export const LOGIN_BUTTON_HEIGHT=40;
const loginHitSlop={top:2,bottom:2};

/**
 * 카카오 로그인 버튼 (카카오 로그인 디자인 가이드 모양). 글자는 다른 버튼과 맞춘 「카카오로 계속하기」(2026-10-22 사용자 결정, 가이드 기본 글자는 「카카오 로그인」). 바탕 #FEE500, 말풍선 심볼 #000000, 글자 #000000 85%, 모서리 12.
 * 심볼 경로는 카카오 리소스 페이지의 미리보기 SVG 그대로다(모양과 비율 변경 금지). 높이는 다른 로그인 버튼과 같은 LOGIN_BUTTON_HEIGHT.
 */
export function KakaoLoginButton({onPress,disabled=false}:{onPress:()=>void;disabled?:boolean}) {
  return <Pressable accessibilityRole="button" accessibilityLabel="카카오로 계속하기" aria-disabled={disabled} accessibilityState={{disabled}} disabled={disabled} onPress={onPress}
    hitSlop={loginHitSlop} style={({pressed})=>({height:LOGIN_BUTTON_HEIGHT,borderRadius:12,backgroundColor:'#FEE500',flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,opacity:pressed?0.8:1})}>
    <Svg width={18} height={18} viewBox="61.5 16.5 13 13" accessibilityElementsHidden importantForAccessibility="no">
      <Path fill="#000000" d="M68.001 16.5225C64.4222 16.5225 61.5225 19.0037 61.5225 22.0641C61.5225 24.0312 62.7219 25.7596 64.5292 26.7423L63.9181 29.2113C63.8954 29.285 63.9132 29.364 63.9619 29.4184C63.9975 29.457 64.0461 29.478 64.0931 29.478C64.1337 29.478 64.1742 29.464 64.2082 29.4341L66.834 27.5144C67.2117 27.5723 67.6007 27.6039 67.9994 27.6039C71.5767 27.6039 74.478 25.1226 74.478 22.0623C74.478 19.002 71.5783 16.5225 68.001 16.5225Z"/>
    </Svg>
    <Text style={{fontSize:17,fontWeight:'500',color:'rgba(0,0,0,0.85)'}}>카카오로 계속하기</Text>
  </Pressable>;
}

/**
 * Google 로그인 버튼 (Google 브랜드 가이드 밝은 테마): 흰 바탕, 테두리 #747775, 글자 #1F1F1F, 표준 4색 G 로고(모양과 색 변경 금지).
 * 다른 로그인 버튼과 같은 크기로 둔다(가이드: 다른 회사 버튼과 비슷한 크기와 무게). 글자는 Apple 기본 버튼의 「계속하기」와 맞춘 「Google로 계속하기」(가이드의 Continue with Google, 2026-10-22 사용자 결정).
 */
export function GoogleLoginButton({onPress,disabled=false}:{onPress:()=>void;disabled?:boolean}) {
  return <Pressable accessibilityRole="button" accessibilityLabel="Google로 계속하기" aria-disabled={disabled} accessibilityState={{disabled}} disabled={disabled} onPress={onPress}
    hitSlop={loginHitSlop} style={({pressed})=>({height:LOGIN_BUTTON_HEIGHT,borderRadius:12,borderWidth:1,borderColor:'#747775',backgroundColor:'#FFFFFF',flexDirection:'row',alignItems:'center',justifyContent:'center',gap:10,opacity:pressed?0.8:1})}>
    <Svg width={20} height={20} viewBox="0 0 48 48" accessibilityElementsHidden importantForAccessibility="no">
      <Path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <Path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <Path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <Path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </Svg>
    <Text style={{fontSize:17,fontWeight:'500',color:'#1F1F1F'}}>Google로 계속하기</Text>
  </Pressable>;
}

/** '개발'은 계정 준비 전 개발용 이메일 로그인 (2026-10-01). */
export type AccountProvider='Apple'|'Google'|'카카오'|'개발';
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

/**
 * 새 계정 동의 (2026-10-21 시안 a). 로그인 뒤 처음 만든 계정에만 시작 화면 위로 띄운다. 두 필수 체크가 켜져야 [동의하고 시작하기]를 누른다.
 * 체크와 보기를 한 행에 둬 이용약관이 한 번만 나온다. 처리방침은 동의가 아니라 안내라 체크 없이 행 전체가 보기다.
 * 닫으면(배경, Android 뒤로가기) onRequestClose — 부르는 쪽이 가입을 그만할지 묻는다.
 */
export function ConsentSheet({visible,ageChecked,termsChecked,onToggleAge,onToggleTerms,onViewTerms,onViewPrivacy,onAgree,onRequestClose,loading=false,overlay}:{visible:boolean;ageChecked:boolean;termsChecked:boolean;onToggleAge:()=>void;onToggleTerms:()=>void;onViewTerms:()=>void;onViewPrivacy:()=>void;onAgree:()=>void;onRequestClose:()=>void;/** 동의를 기록하는 중 */loading?:boolean;/** 시트 위에 띄울 다이얼로그(PixelBottomSheet overlay) */overlay?:ReactNode}) {
  return <PixelBottomSheet visible={visible} title="처음 오셨네요" onRequestClose={onRequestClose} overlay={overlay}>
    {/* 제목만 있고 바로 체크 칸이 나오면 무엇을 하라는지 알기 어렵다 (2026-10-22 사용자 메모) */}
    <Caption>계정을 만들려면 아래 내용을 확인하고 동의해 주세요.</Caption>
    <View>
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
    <PixelButton label="동의하고 시작하기" disabled={!(ageChecked&&termsChecked)} loading={loading} onPress={onAgree}/>
  </PixelBottomSheet>;
}
