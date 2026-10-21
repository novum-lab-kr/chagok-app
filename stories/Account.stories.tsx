import React,{useState} from 'react';
import {View,useWindowDimensions} from 'react-native';
import type {Meta,StoryObj} from '@storybook/react-vite';
import {AccountLoginScreen,ConsentSheet} from '../src/design-system';
import {AppleButtonPreview} from './support/appleButton';

const meta={title:'Screens/Account login',parameters:{layout:'fullscreen',edgeToEdge:true,docs:{description:{component:'계정으로 시작하기 (2026-10-21 로그인 먼저 시안). 시작 화면에는 로그인 버튼만 두고, 처음 만든 계정에만 로그인 뒤 「처음 오셨네요」 시트로 동의를 받는다(시안 a). Apple 버튼은 앱에서 네이티브 기본 버튼이고 여기서는 모양만 흉내 낸다. 앱 동작에 연결되지 않습니다.'}}}} satisfies Meta;
export default meta;
type Story=StoryObj<typeof meta>;
const noop=()=>{};

function Phone({children}:{children:React.ReactNode}) {
  const {width}=useWindowDimensions();
  return <View style={{width:Math.min(width,390),height:844}}>{children}</View>;
}
function Consent({age=false,terms=false}:{age?:boolean;terms?:boolean}) {
  const [a,setA]=useState(age);const [t,setT]=useState(terms);
  return <Phone>
    <AccountLoginScreen loginButtons={<AppleButtonPreview/>} onLocal={noop}/>
    <ConsentSheet visible ageChecked={a} termsChecked={t} onToggleAge={()=>setA(!a)} onToggleTerms={()=>setT(!t)} onViewTerms={noop} onViewPrivacy={noop} onAgree={noop} onRequestClose={noop}/>
  </Phone>;
}

export const Start:Story={name:'1 첫 실행',render:()=><Phone><AccountLoginScreen loginButtons={<AppleButtonPreview/>} onLocal={noop}/></Phone>};
export const Settings:Story={name:'1 앱 설정에서 계정 연결',render:()=><Phone><AccountLoginScreen loginButtons={<AppleButtonPreview/>} onBack={noop}/></Phone>};
export const ConsentEmpty:Story={name:'2 처음 만든 계정, 체크 전',render:()=><Consent/>};
export const ConsentReady:Story={name:'2 처음 만든 계정, 모두 체크',render:()=><Consent age terms/>};
