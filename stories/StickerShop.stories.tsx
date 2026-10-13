import React,{useState} from 'react';
import type {Meta,StoryObj} from '@storybook/react-vite';
import {PackScreen,StickerChooserScreen,colorPack,togglePack,type PackView,type StickerId} from '../src/design-system';
import type {ColorStickerPackId} from '../src/stickers/color/catalog';
import {Stage,noop} from './support/frame';

const meta={title:'Screens/Sticker Shop',parameters:{layout:'fullscreen',edgeToEdge:true,docs:{description:{component:'스티커 묶음과 구매 (PRD 4.12, 2026-10-08 확정 시안 19판). 사기 전 확인·실패·체험 안내 문구는 Components/Dialog 「문구 모음」에 있다. 결제 팝업은 Apple·Google이, 보상형 광고는 AdMob이 그린다. 앱 동작에 연결되지 않습니다.'}}}} satisfies Meta;
export default meta;
type Story=StoryObj<typeof meta>;
/** 처음에는 지금 고른 스티커가 든 묶음을 펼친다. */
function ChooserHost({packs,selected='basic.book',days=5,initialMine=false,initialOpen}:{packs:readonly PackView[];selected?:StickerId;days?:number;initialMine?:boolean;initialOpen?:ColorStickerPackId}) {
  const [mine,setMine]=useState(initialMine);
  const [value,setValue]=useState<StickerId>(selected);
  const [open,setOpen]=useState<readonly ColorStickerPackId[]>([initialOpen??(selected.split('.')[0] as ColorStickerPackId)]);
  return <StickerChooserScreen packs={packs} mine={mine} onChangeMine={setMine} selected={value} onSelect={setValue} openPacks={open} onToggle={id=>setOpen(o=>togglePack(o,id))} reward={{days,goal:7}} onOpenPack={noop} onDone={noop} onBack={noop}/>;
}
/** 잠긴 묶음 — 가격은 앱에서 스토어가 준 값(src/purchases/price.ts). 여기서는 원화 계정, null이면 못 받아 왔을 때 */
const locked=(id:ColorStickerPackId,price:string|null='2,200원'):PackView=>({...colorPack(id,'locked'),...(price?{price}:{})});
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
export const PackNoPrice:Story={name:'2 묶음 화면 · 가격을 못 받아 왔을 때',render:()=><Stage>{pack(false,5,undefined,locked('animals_normal',null))}</Stage>};
export const PackBuying:Story={name:'2 묶음 화면 · 결제 기다리는 중',render:()=><Stage>{pack(false,5,'buy')}</Stage>};

// 3. 연 뒤
export const ChooserBought:Story={name:'3 산 직후',render:()=><Stage><ChooserHost packs={afterBuy} initialOpen="animals_normal"/></Stage>};
