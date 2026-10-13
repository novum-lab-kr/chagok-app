import React,{useState,type ReactNode} from 'react';
import {View,useWindowDimensions} from 'react-native';
import type {Meta,StoryObj} from '@storybook/react-vite';
import {BoardDetailScreen,PackScreen,PixelDialog,StickerChooserScreen,colorPack,retro,stickerShopDialogs,togglePack,type PackView,type StickerId} from '../src/design-system';
import type {ColorStickerPackId} from '../src/stickers/color/catalog';

const meta={title:'Screens/Sticker Shop',parameters:{layout:'fullscreen',edgeToEdge:true,docs:{description:{component:'스티커 묶음과 구매 (PRD 4.12, 2026-10-08 확정 시안 19판). 다이얼로그는 앱에서 PixelDialogModal이 같은 배치로 띄운다. 결제 팝업은 Apple·Google이, 보상형 광고는 AdMob이 그린다. 앱 동작에 연결되지 않습니다.'}}}} satisfies Meta;
export default meta;
type Story=StoryObj<typeof meta>;
const c=retro.color;
const noop=()=>{};

function Stage({children}:{children:ReactNode}) {
  const {width}=useWindowDimensions();
  return <View style={{width:Math.min(width,390),height:844,backgroundColor:c.screen}}>{children}</View>;
}
/** 화면 위에 얹은 다이얼로그. 앱에서는 PixelDialogModal이 같은 배치를 한다. */
function Dialog(props:React.ComponentProps<typeof PixelDialog>) {
  return <View style={{position:'absolute',left:0,right:0,top:0,bottom:0,alignItems:'center',justifyContent:'center',padding:20}}>
    <View style={{position:'absolute',left:0,right:0,top:0,bottom:0,backgroundColor:c.ink,opacity:retro.opacity.scrim}}/>
    <PixelDialog variant="basic" {...props}/>
  </View>;
}
/** 처음에는 지금 고른 스티커가 든 묶음을 펼친다. */
function ChooserHost({packs,selected='basic.book',days=5,initialMine=false,initialOpen}:{packs:readonly PackView[];selected?:StickerId;days?:number;initialMine?:boolean;initialOpen?:ColorStickerPackId}) {
  const [mine,setMine]=useState(initialMine);
  const [value,setValue]=useState<StickerId>(selected);
  const [open,setOpen]=useState<readonly ColorStickerPackId[]>([initialOpen??(selected.split('.')[0] as ColorStickerPackId)]);
  return <StickerChooserScreen packs={packs} mine={mine} onChangeMine={setMine} selected={value} onSelect={setValue} openPacks={open} onToggle={id=>setOpen(o=>togglePack(o,id))} reward={{days,goal:7}} onOpenPack={noop} onDone={noop} onBack={noop}/>;
}
/** 잠긴 묶음 — 가격은 앱에서 스토어가 준 값(src/purchases/price.ts). 여기서는 원화 계정 */
const locked=(id:ColorStickerPackId,price:string|undefined='2,200원'):PackView=>({...colorPack(id,'locked'),...(price?{price}:{})});
const owned=[colorPack('basic','free'),colorPack('snack_normal','owned'),locked('animals_normal'),locked('weather_normal')];
const trying=(label:string)=>[colorPack('basic','free'),colorPack('snack_normal','owned'),colorPack('animals_normal','trial',label),locked('weather_normal')];
const afterBuy=[colorPack('basic','free'),colorPack('snack_normal','owned'),colorPack('animals_normal','owned'),locked('weather_normal')];
const animals=locked('animals_normal');
/** 판 예시: 묶음 안에서 서로 다른 5개 */
const sample=[0,4,7,2,9].map(i=>animals.stickers[i]);
const pack=(adFree:boolean,days:number,busy?:'buy'|'ad',p:PackView=animals)=><PackScreen pack={p} sample={sample} adFree={adFree} reward={{days,goal:7}} onBuy={noop} onWatchAd={noop} onTrial={noop} onBack={noop} busy={busy}/>;

// 1. 기본 스티커
export const Chooser:Story={name:'1 기본 스티커',render:()=><Stage><ChooserHost packs={owned}/></Stage>};
export const ChooserMine:Story={name:'1 기본 스티커 · 내 스티커',render:()=><Stage><ChooserHost packs={owned} initialMine/></Stage>};
export const ChooserRewardReady:Story={name:'1 기본 스티커 · 붙인 날이 찼을 때',render:()=><Stage><ChooserHost packs={owned} days={7}/></Stage>};
export const ChooserTrial:Story={name:'1 기본 스티커 · 3일 써 보는 중',render:()=><Stage><ChooserHost packs={trying('3일 남음')} selected="animals_normal.dog"/></Stage>};

// 2. 묶음 화면
export const Pack:Story={name:'2 묶음 화면',render:()=><Stage>{pack(false,5)}</Stage>};
export const PackRewardReady:Story={name:'2 묶음 화면 · 붙인 날이 찼을 때',render:()=><Stage>{pack(false,7)}</Stage>};
export const PackAdFree:Story={name:'2 묶음 화면 · 광고 제거를 산 사람',render:()=><Stage>{pack(true,5)}</Stage>};
export const PackConfirmBuy:Story={name:'2 묶음 화면 · 사기 전 확인',render:()=><Stage>{pack(false,5)}<Dialog {...stickerShopDialogs.confirmBuy(animals.label,animals.stickers.length,animals.price)}/></Stage>};
export const PackNoPrice:Story={name:'2 묶음 화면 · 가격을 못 받아 왔을 때',render:()=><Stage>{pack(false,5,undefined,locked('animals_normal',undefined))}</Stage>};
export const PackNoPriceConfirm:Story={name:'2 묶음 화면 · 가격 없이 사기 전 확인',render:()=><Stage>{pack(false,5,undefined,locked('animals_normal',undefined))}<Dialog {...stickerShopDialogs.confirmBuy(animals.label,animals.stickers.length)}/></Stage>};
export const PackBuying:Story={name:'2 묶음 화면 · 결제 기다리는 중',render:()=><Stage>{pack(false,5,'buy')}</Stage>};
export const PackBuyFailed:Story={name:'2 묶음 화면 · 결제 실패',render:()=><Stage>{pack(false,5)}<Dialog {...stickerShopDialogs.buyFailed}/></Stage>};
export const PackPending:Story={name:'2 묶음 화면 · 보호자 승인 기다림',render:()=><Stage>{pack(false,5)}<Dialog {...stickerShopDialogs.purchasePending}/></Stage>};
export const PackAdUnavailable:Story={name:'2 묶음 화면 · 광고를 못 불러옴',render:()=><Stage>{pack(false,5)}<Dialog {...stickerShopDialogs.adUnavailable}/></Stage>};

// 3. 연 뒤
export const ChooserBought:Story={name:'3 산 직후',render:()=><Stage><ChooserHost packs={afterBuy} initialOpen="animals_normal"/><Dialog {...stickerShopDialogs.bought('동물')}/></Stage>};
export const ChooserAdTrialStarted:Story={name:'3 광고를 다 본 뒤',render:()=><Stage><ChooserHost packs={trying('24시간 남음')} selected="animals_normal.dog"/><Dialog {...stickerShopDialogs.adTrialStarted('내일 밤 11:00')}/></Stage>};
export const TrialEnded:Story={name:'3 체험이 끝난 뒤 붙이려 할 때',render:()=><Stage>
  <BoardDetailScreen name="책 읽기" sticker="animals_normal.dog" completed={false} progress={{value:4,total:15,percentLabel:'26%'}}
    board={{kind:'tally',total:15,filled:{1:'animals_normal.dog',2:'animals_normal.dog',3:'animals_normal.dog',4:'animals_normal.dog'},onPress:noop,onOpenRecord:noop}} onBack={noop} onSettings={noop}/>
  <Dialog {...stickerShopDialogs.trialEnded('3일')}/>
</Stage>};
