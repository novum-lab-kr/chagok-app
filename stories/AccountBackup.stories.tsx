import React,{useState,type ReactNode} from 'react';
import {View,useWindowDimensions} from 'react-native';
import type {Meta,StoryObj} from '@storybook/react-vite';
import {
  AccountBackupPanel,AccountDeletedScreen,AccountStartScreen,AppHeader,ConsentScreen,DeleteAccountScreen,GoalListHeader,GoalSummaryCard,
  PixelBusyDialog,PixelButton,PixelDialog,PixelPanel,PixelText,RestoreConflictScreen,RetroScreen,ScreenHeader,SettingRow,accountDialogs,retro,
  type AccountBackupStatus,type AccountStartChoice,type RestoreSide,
} from '../src/design-system';

const meta={title:'Screens/Account backup',parameters:{layout:'fullscreen',edgeToEdge:true,docs:{description:{component:'계정·백업 화면 (2026-10-01 확정 시안). 다이얼로그는 앱에서 PixelDialogModal·PixelBusyModal이 같은 배치로 띄운다. 앱 동작에 연결되지 않습니다.'}}}} satisfies Meta;
export default meta;
type Story=StoryObj<typeof meta>;
const c=retro.color;
const noop=()=>{};

function Stage({children,auto=false}:{children:ReactNode;auto?:boolean}) {
  const {width}=useWindowDimensions();
  return <View style={{width:Math.min(width,390),height:auto?undefined:844,minHeight:auto?844:undefined,backgroundColor:c.screen}}>{children}</View>;
}
/** 화면 위를 막는 어두운 막. 앱에서는 Modal 호스트가 같은 배치를 한다. */
function Scrim({children}:{children:ReactNode}) {
  return <View style={{position:'absolute',left:0,right:0,top:0,bottom:0,alignItems:'center',justifyContent:'center',padding:20}}>
    <View style={{position:'absolute',left:0,right:0,top:0,bottom:0,backgroundColor:c.ink,opacity:retro.opacity.scrim}}/>
    {children}
  </View>;
}
function Dialog(props:React.ComponentProps<typeof PixelDialog>) {
  return <Scrim><PixelDialog variant="basic" {...props}/></Scrim>;
}
function Label({children}:{children:string}) {
  return <View style={{marginTop:8}}><PixelText variant="caption" style={{color:c.buttonText}}>{`▸ ${children}`}</PixelText></View>;
}

function Start({initial='account'}:{initial?:AccountStartChoice}) {
  const [value,setValue]=useState(initial);
  return <AccountStartScreen value={value} onChange={setValue} onContinue={noop}/>;
}
function Settings({status={state:'synced',provider:'Apple',backedUpAt:'오늘 9:20'}}:{status?:AccountBackupStatus}) {
  return <RetroScreen style={{gap:16}} header={<ScreenHeader title="앱 설정" onBack={noop}/>}>
    <AccountBackupPanel status={status} onConnect={noop} onLogin={noop} onLogout={noop} onDelete={noop}/>
    <PixelPanel title="도움말"><SettingRow label="사용법 다시 보기" onPress={noop}/></PixelPanel>
    <PixelPanel title="정보"><SettingRow label="약관과 라이선스" onPress={noop}/></PixelPanel>
  </RetroScreen>;
}
function Home() {
  return <RetroScreen style={{gap:16}} header={<AppHeader onSettings={noop}/>}>
    <GoalListHeader tab="active" counts={{active:2,completed:1}} onTab={noop} onAdd={noop}/>
    <GoalSummaryCard name="매일 산책하기" sticker="shoe" kind="달력판" percent={40} status={['이번 달 40% 채웠어요']} onPress={noop}/>
    <GoalSummaryCard name="책 20권 읽기" sticker="book" kind="적립판" percent={35} status={['35% 채웠어요']} onPress={noop}/>
  </RetroScreen>;
}
function Conflict() {
  const [value,setValue]=useState<RestoreSide>('server');
  return <RestoreConflictScreen value={value} onChange={setValue} onConfirm={noop} onBack={noop}
    server={{goals:4,stickers:38,goalNames:['책 읽기','매일 산책하기','물 여덟 잔 마시기','일기 쓰기'],updatedAt:'9월 27일'}}
    device={{goals:2,stickers:12,goalNames:['물 여덟 잔 마시기','일기 쓰기'],updatedAt:'9월 28일'}}/>;
}
const Delete=()=><DeleteAccountScreen onDelete={noop} onCancel={noop} onBack={noop}/>;

// 1. 시작
export const StartAccount:Story={name:'1 시작 · 계정 연결',render:()=><Stage><Start/></Stage>};
export const StartLocal:Story={name:'1 시작 · 이 기기에서만',render:()=><Stage><Start initial="local"/></Stage>};

// 2. 앱 설정
export const SettingsSynced:Story={name:'2 설정 · 연결됨',render:()=><Stage><Settings/></Stage>};
export const SettingsStates:Story={name:'2 설정 · 상태별',render:()=><Stage auto><View style={{padding:20,gap:12}}>
  <Label>계정 없음</Label>
  <AccountBackupPanel status={{state:'local'}} onConnect={noop} onLogin={noop} onLogout={noop} onDelete={noop}/>
  <Label>백업 못 한 기록</Label>
  <AccountBackupPanel status={{state:'pending',provider:'Apple'}} onConnect={noop} onLogin={noop} onLogout={noop} onDelete={noop}/>
  <Label>첫 백업 중</Label>
  <AccountBackupPanel status={{state:'firstBackup',provider:'Google'}} onConnect={noop} onLogin={noop} onLogout={noop} onDelete={noop}/>
  <Label>로그인 필요</Label>
  <AccountBackupPanel status={{state:'needsLogin',provider:'Apple'}} onConnect={noop} onLogin={noop} onLogout={noop} onDelete={noop}/>
</View></Stage>};
/** 로그인이 풀리면 앱을 열 때 한 번 묻는다. [나중에] 뒤로는 앱 설정의 계정 칸이 안내한다. */
export const SessionExpired:Story={name:'2 다시 로그인 묻기',render:()=><Stage><Home/><Dialog {...accountDialogs.session}/></Stage>};

// 3. 복원 충돌
export const RestoreConflict:Story={name:'3 복원 충돌',render:()=><Stage><Conflict/></Stage>};

// 4. 복원 진행·실패
export const RestoreFromSettings:Story={name:'4 복원 · 앱 설정에서 연결',render:()=><Stage><Settings status={{state:'restoring',provider:'Apple'}}/><Scrim><PixelBusyDialog {...accountDialogs.restoring}/></Scrim></Stage>};
export const RestoreFirstRun:Story={name:'4 복원 · 첫 실행',render:()=><Stage><Start/><Scrim><PixelBusyDialog {...accountDialogs.restoring}/></Scrim></Stage>};
export const RestoreFailed:Story={name:'4 복원 · 실패',render:()=><Stage><Start/><Dialog {...accountDialogs.restoreFailed}/></Stage>};

// 5. 로그아웃
export const Logout:Story={name:'5 로그아웃 · 확인',render:()=><Stage><Settings/><Dialog {...accountDialogs.logout}/></Stage>};
export const LogoutBusy:Story={name:'5 로그아웃 · 백업 중',render:()=><Stage><Settings/><Dialog {...accountDialogs.logout} loading/></Stage>};
export const LogoutFailed:Story={name:'5 로그아웃 · 백업 실패',render:()=><Stage><Settings/><Dialog {...accountDialogs.logoutFailed}/></Stage>};
export const LogoutHeld:Story={name:'5 로그아웃 · 백업할 수 없는 기록',render:()=><Stage><Settings/><Dialog {...accountDialogs.logoutHeld(2)}/></Stage>};

// 6. 계정 삭제
export const DeleteConfirm:Story={name:'6 계정 삭제 · 내용 확인',render:()=><Stage><Delete/></Stage>};
export const DeleteFinal:Story={name:'6 계정 삭제 · 최종 확인',render:()=><Stage><Delete/><Dialog {...accountDialogs.deleteAccount}/></Stage>};
export const DeleteBusy:Story={name:'6 계정 삭제 · 삭제 중',render:()=><Stage><Delete/><Dialog {...accountDialogs.deleteAccount} loading/></Stage>};
export const DeleteFailed:Story={name:'6 계정 삭제 · 실패',render:()=><Stage><Delete/><Dialog {...accountDialogs.deleteFailed}/></Stage>};
export const DeleteDone:Story={name:'6 계정 삭제 · 완료',render:()=><Stage><AccountDeletedScreen onDone={noop}/></Stage>};

// 7. 약관 변경 안내 · 만 14세 미만
export const TermsChanged:Story={name:'7 약관 변경 안내',render:()=><Stage><Home/><Dialog {...accountDialogs.termsChanged('10월 15일')}/></Stage>};
export const Under14:Story={name:'7 만 14세 미만 안내',render:()=><Stage>
  <ConsentScreen ageChecked={false} termsChecked={false} onToggleAge={noop} onToggleTerms={noop} onViewTerms={noop} onViewPrivacy={noop} onUnder14={noop} onBack={noop}
    loginButtons={<PixelButton label="Apple로 계속 (자리 표시)" onPress={noop}/>}/>
  <Dialog {...accountDialogs.under14}/>
</Stage>};
