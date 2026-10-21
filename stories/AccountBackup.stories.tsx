import React,{useState} from 'react';
import {View} from 'react-native';
import type {Meta,StoryObj} from '@storybook/react-vite';
import {
  AccountBackupPanel,AccountDeletedScreen,DeleteAccountScreen,PixelText,RestoreConflictScreen,retro,
  type RestoreSide,
} from '../src/design-system';
import {SettingsTab,Stage,noop} from './support/frame';

const meta={title:'Screens/Account backup',parameters:{layout:'fullscreen',edgeToEdge:true,docs:{description:{component:'계정·백업 화면 (2026-10-01 확정 시안). 설정은 2026-10-12부터 하단 「설정」 탭이다. 로그아웃·복원·삭제·구매 확인 창 문구는 Components/Dialog 「문구 모음」에 있다. 앱 동작에 연결되지 않습니다.'}}}} satisfies Meta;
export default meta;
type Story=StoryObj<typeof meta>;
const c=retro.color;

function Label({children}:{children:string}) {
  return <View style={{marginTop:8}}><PixelText variant="caption" style={{color:c.buttonText}}>{`▸ ${children}`}</PixelText></View>;
}
function Conflict() {
  const [value,setValue]=useState<RestoreSide>('server');
  return <RestoreConflictScreen value={value} onChange={setValue} onConfirm={noop} onBack={noop}
    server={{goals:4,stickers:38,goalNames:['책 읽기','매일 산책하기','물 여덟 잔 마시기','일기 쓰기'],updatedAt:'9월 27일'}}
    device={{goals:2,stickers:12,goalNames:['물 여덟 잔 마시기','일기 쓰기'],updatedAt:'9월 28일'}}/>;
}

// 1. 시작은 Screens/Account login (2026-10-21)

// 2. 설정 탭
export const SettingsSynced:Story={name:'2 설정 · 연결됨',render:()=><Stage tab="settings"><SettingsTab/></Stage>};
export const SettingsStates:Story={name:'2 설정 · 계정 칸 상태별',render:()=><Stage auto><View style={{padding:20,gap:12}}>
  <Label>계정 없음</Label>
  <AccountBackupPanel status={{state:'local'}} onConnect={noop} onLogin={noop} onLogout={noop} onDelete={noop}/>
  <Label>백업 못 한 기록</Label>
  <AccountBackupPanel status={{state:'pending',provider:'Apple'}} onConnect={noop} onLogin={noop} onLogout={noop} onDelete={noop}/>
  <Label>첫 백업 중</Label>
  <AccountBackupPanel status={{state:'firstBackup',provider:'Google'}} onConnect={noop} onLogin={noop} onLogout={noop} onDelete={noop}/>
  <Label>기록 가져오는 중</Label>
  <AccountBackupPanel status={{state:'restoring',provider:'Apple'}} onConnect={noop} onLogin={noop} onLogout={noop} onDelete={noop}/>
  <Label>로그인 필요</Label>
  <AccountBackupPanel status={{state:'needsLogin',provider:'Apple'}} onConnect={noop} onLogin={noop} onLogout={noop} onDelete={noop}/>
</View></Stage>};

// 3. 복원 충돌
export const RestoreConflict:Story={name:'3 복원 충돌',render:()=><Stage><Conflict/></Stage>};

// 6. 계정 삭제
export const DeleteConfirm:Story={name:'6 계정 삭제 · 내용 확인',render:()=><Stage><DeleteAccountScreen onDelete={noop} onCancel={noop} onBack={noop}/></Stage>};
export const DeleteDone:Story={name:'6 계정 삭제 · 완료',render:()=><Stage><AccountDeletedScreen onDone={noop}/></Stage>};

// 8. 구매 (2026-10-08 스티커 화면 시안 확정, PRD 4.9·4.12)
export const SettingsAdFree:Story={name:'8 구매 · 광고 제거를 산 뒤',render:()=><Stage tab="settings"><SettingsTab adFree/></Stage>};
export const RestoreWaiting:Story={name:'8 구매 복원 · 기다리는 중',render:()=><Stage tab="settings"><SettingsTab busy="restore"/></Stage>};
export const AdFreeNoPrice:Story={name:'8 광고 제거 · 가격을 못 받아 왔을 때',render:()=><Stage tab="settings"><SettingsTab price={null}/></Stage>};
export const AdFreeWaiting:Story={name:'8 광고 제거 · 결제 기다리는 중',render:()=><Stage tab="settings"><SettingsTab busy="adFree"/></Stage>};
