import React,{useState} from 'react';
import {View} from 'react-native';
import type {Meta,StoryObj} from '@storybook/react-vite';
import {PixelDialog,StickerCollectionScreen,SubscriptionScreen,colorPack,retro,stickerShopDialogs,togglePack,type SubscriptionPlanView} from '../src/design-system';
import {t} from '../src/i18n';
import type {ColorStickerPackId} from '../src/stickers/color/catalog';
import {SettingsTab,Stage,noop} from './support/frame';

const meta={title:'Screens/Subscription',parameters:{layout:'fullscreen',edgeToEdge:true,docs:{description:{component:'구독 (2026-11-02 구독 흐름 시안 1판 확정, Athena 구독 설계 D1~D10). 가격과 날짜는 예시이고 앱에서는 스토어 값으로 만든다. 결제 연결은 아직 없다.'}}}} satisfies Meta;
export default meta;
type Story=StoryObj<typeof meta>;

/** 예시: 월 4,900원, 연 24,900원(57% 저렴, 1년에 33,900원 저렴) */
const month:SubscriptionPlanView={price:'4,900원',range:'2026.11.02 ~ 2026.12.01',next:'2026년 12월 2일'};
const year:SubscriptionPlanView={price:'24,900원',savePercent:57,saveAmount:'33,900원',range:'2026.11.02 ~ 2027.11.01',next:'2027년 11월 2일'};
const screen=(props:Partial<React.ComponentProps<typeof SubscriptionScreen>>={})=><Stage auto><SubscriptionScreen month={month} year={year} onSubscribe={noop} onRestore={noop} onTerms={noop} onPrivacy={noop} onBack={noop} {...props}/></Stage>;

// 1. 구독 화면
export const Subscribe:Story={name:'1 구독 화면',render:()=>screen()};
export const SubscribeGoalLimit:Story={name:'1 구독 화면, 목표 탭 [+]에서 열었을 때',render:()=>screen({goalLimit:true})};
export const SubscribeBuying:Story={name:'1 구독 화면, 결제 기다리는 중',render:()=>screen({busy:'year'})};

// 2. 앱 설정 「구매」
export const SettingsNone:Story={name:'2 앱 설정, 구독 전',render:()=><Stage tab="settings"><SettingsTab subscription={{state:'none'}}/></Stage>};
export const SettingsActive:Story={name:'2 앱 설정, 구독 중',render:()=><Stage tab="settings"><SettingsTab subscription={{state:'active',plan:'year',date:'2027년 11월 2일'}}/></Stage>};
export const SettingsCancelling:Story={name:'2 앱 설정, 해지 예약',render:()=><Stage tab="settings"><SettingsTab subscription={{state:'cancelling',plan:'month',date:'2026년 12월 1일'}}/></Stage>};

// 3. 구독 중 스티커 탭: 잠긴 묶음이 없고 배지 자리에 「구독 중」
function Collection(){
  const [mine,setMine]=useState(false);
  const [open,setOpen]=useState<readonly ColorStickerPackId[]>(['christmas_normal']);
  const sub=(id:ColorStickerPackId)=>colorPack(id,'trial',t('sub.active'));
  return <StickerCollectionScreen packs={[colorPack('basic','free'),sub('christmas_normal'),sub('study_normal'),sub('food_normal')]} mine={mine} onChangeMine={setMine} openPacks={open} onToggle={id=>setOpen(o=>togglePack(o,id))} reward={{days:5,goal:7}} onOpenPack={noop} hideReward/>;
}
export const StickersSubscribed:Story={name:'3 스티커 탭, 구독 중',render:()=><Stage tab="stickers"><Collection/></Stage>};

// 4. 구독이 끝난 뒤 그 묶음 스티커를 붙이려 할 때
export const Ended:Story={name:'4 구독이 끝난 뒤',render:()=><Stage><View style={{flex:1,justifyContent:'center',padding:16,backgroundColor:retro.color.screen}}><PixelDialog variant="basic" {...stickerShopDialogs.subscriptionEnded} onPrimary={noop} onSecondary={noop}/></View></Stage>};
