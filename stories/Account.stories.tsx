import React,{useState} from 'react';
import {View,useWindowDimensions} from 'react-native';
import type {Meta,StoryObj} from '@storybook/react-vite';
import {ConsentScreen,PixelButton} from '../src/design-system';

const meta={title:'Screens/Account consent',parameters:{layout:'fullscreen',edgeToEdge:true,docs:{description:{component:'계정 연결 직전 동의 화면 (약관 설계). 로그인 버튼은 자리 표시다 — 앱에서는 Apple·Google 공식 버튼. 앱 동작에 연결되지 않습니다.'}}}} satisfies Meta;
export default meta;
type Story=StoryObj<typeof meta>;
const noop=()=>{};
function Demo({ios=true,age=false,terms=false}:{ios?:boolean;age?:boolean;terms?:boolean}) {
  const [a,setA]=useState(age);const [t,setT]=useState(terms);
  const {width}=useWindowDimensions();
  return <View style={{width:Math.min(width,390),height:844}}><ConsentScreen ageChecked={a} termsChecked={t} onToggleAge={()=>setA(!a)} onToggleTerms={()=>setT(!t)} onViewTerms={noop} onViewPrivacy={noop} onUnder14={noop} onBack={noop}
    loginButtons={<>{ios&&<PixelButton label="Apple로 계속 (자리 표시)" onPress={noop}/>}<PixelButton label="Google로 계속 (자리 표시)" variant="secondary" onPress={noop}/></>}/></View>;
}
export const Empty:Story={name:'iOS · 체크 전',render:()=><Demo/>};
export const Ready:Story={name:'iOS · 모두 체크',render:()=><Demo age terms/>};
export const Android:Story={name:'Android · Google만',render:()=><Demo ios={false}/>};
