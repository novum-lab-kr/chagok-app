import React,{useState} from 'react';
import {View,useWindowDimensions} from 'react-native';
import type {Meta,StoryObj} from '@storybook/react-vite';
import {ConsentScreen,LoginCircles,type LoginProvider} from '../src/design-system';

const meta={title:'Screens/Account consent',parameters:{layout:'fullscreen',edgeToEdge:true,docs:{description:{component:'계정 연결 직전 동의 화면 (약관 설계). 제목은 「시작하기」(2026-10-15 시안 2안). 로그인 버튼은 지름 52 동그라미 안에 회사 로고만 둔다 (2026-10-15 시안 틀4). 회사 색은 디자인 시스템의 예외다. 앱 동작에 연결되지 않습니다.'}}}} satisfies Meta;
export default meta;
type Story=StoryObj<typeof meta>;
const noop=()=>{};

/** 순서는 카카오 → Apple → Google (2026-10-15). Android에는 Apple이 없다. */
const IOS:LoginProvider[]=['kakao','apple','google'];
const ANDROID:LoginProvider[]=['kakao','google'];

function Demo({providers=IOS,age=false,terms=false}:{providers?:LoginProvider[];age?:boolean;terms?:boolean}) {
  const [a,setA]=useState(age);const [t,setT]=useState(terms);
  const {width}=useWindowDimensions();
  return <View style={{width:Math.min(width,390),height:844}}><ConsentScreen providers={providers} ageChecked={a} termsChecked={t} onToggleAge={()=>setA(!a)} onToggleTerms={()=>setT(!t)} onViewTerms={noop} onViewPrivacy={noop} onUnder14={noop} onBack={noop}
    loginButtons={<LoginCircles providers={providers} onPress={noop}/>}/></View>;
}
export const Empty:Story={name:'iOS · 체크 전',render:()=><Demo/>};
export const Ready:Story={name:'iOS · 모두 체크',render:()=><Demo age terms/>};
export const Android:Story={name:'Android 카카오와 Google',render:()=><Demo providers={ANDROID} age terms/>};

