import React,{type ReactNode} from 'react';
import {View,useWindowDimensions} from 'react-native';
import {AccountBackupPanel,FloatingTabBar,HelpInfoPanel,PurchasePanel,RetroScreen,TabTitle,retro,type AccountBackupStatus,type TabItem} from '../../src/design-system';

/** 화면 스토리 공통 틀. 화면 스토리는 이 파일만 쓰고 틀을 따로 만들지 않는다. */
export const noop=()=>{};
const c=retro.color;

export type Tab='index'|'records'|'stickers'|'settings';
/** app/(tabs)/_layout.tsx와 같은 탭 */
export const TABS:readonly TabItem<Tab>[]=[{key:'index',label:'목표',icon:'goal'},{key:'records',label:'기록',icon:'record'},{key:'stickers',label:'스티커',icon:'sticker'},{key:'settings',label:'설정',icon:'settings'}];

/**
 * 폰 한 화면(폭 최대 390, 높이 844).
 * tab을 주면 하단 탭 바를 붙이고(앱의 expo-router Tabs와 같은 배치), ad면 그 위에 광고 자리를 둔다(목표 탭만, 8pt 띄움).
 * auto는 내용 길이만큼 늘어난다(긴 목록 캡처용).
 */
export function Stage({children,tab,ad=false,auto=false}:{children:ReactNode;tab?:Tab;ad?:boolean;auto?:boolean}) {
  const {width}=useWindowDimensions();
  return <View style={{width:Math.min(width,390),height:auto?undefined:844,minHeight:auto?844:undefined,backgroundColor:c.screen}}>
    <View style={{flex:1}}>{children}</View>
    {ad&&<View style={{paddingBottom:8}}><AdSlot/></View>}
    {tab&&<FloatingTabBar items={TABS} value={tab} onChange={noop}/>}
  </View>;
}

/** 광고 자리: AdMob 배너. 앱 밖에서 오는 그림이라 앱 팔레트를 쓰지 않는다(광고 위치 시안과 같은 회색 상자). */
function AdSlot() {
  return <View style={{height:62,backgroundColor:'#f1f1f1',borderTopWidth:1,borderBottomWidth:1,borderColor:'#c9c9c9',justifyContent:'center',paddingHorizontal:12}}>
    <View style={{position:'absolute',left:12,top:13,width:36,height:36,backgroundColor:'#d9d9d9'}}/>
  </View>;
}

/** 설정 탭 내용 (app/(tabs)/settings.tsx와 같은 순서). 탭 바는 Stage tab="settings"가 붙인다. */
export function SettingsTab({status={state:'synced',provider:'Apple',backedUpAt:'오늘 9:20'},adFree=false,busy,price='5,500원'}:{status?:AccountBackupStatus;adFree?:boolean;busy?:'adFree'|'restore';/** 스토어가 준 가격(원화 계정). null이면 못 받아 왔을 때 */price?:string|null}) {
  return <RetroScreen style={{gap:16}} header={<TabTitle title="설정"/>}>
    <AccountBackupPanel status={status} onConnect={noop} onLogin={noop} onLogout={noop} onDelete={noop}/>
    <PurchasePanel adFree={adFree} price={price??undefined} onRemoveAds={noop} onRestore={noop} busy={busy}/>
    <HelpInfoPanel adFree={adFree} version="1.0.0" onTutorial={noop} onContact={noop} onReportAd={noop} onPolicies={noop}/>
  </RetroScreen>;
}
