import React,{useState} from 'react';
import {Image,Text,View,useWindowDimensions} from 'react-native';
import type {Meta,StoryObj} from '@storybook/react-vite';
import {ConsentScreen} from '../src/design-system';

const meta={title:'Screens/Account consent',parameters:{layout:'fullscreen',edgeToEdge:true,docs:{description:{component:'계정 연결 직전 동의 화면 (약관 설계). 로그인 버튼은 디자인 시스템의 예외로 각 회사 공식 버튼을 쓴다. 여기 버튼은 공식 모양을 흉내 낸 미리보기다 — Apple은 Apple 서버가 그린 공식 버튼 이미지, Google은 공식 자산의 G 로고와 브랜드 가이드 값. 앱에서는 Apple 시스템 버튼(expo-apple-authentication)과 Google 가이드대로 만든 버튼을 넣는다. 앱 동작에 연결되지 않습니다.'}}}} satisfies Meta;
export default meta;
type Story=StoryObj<typeof meta>;
const noop=()=>{};

/**
 * 색은 둘 다 흰색 (2026-10-01 사용자 결정): Apple 흰색 테두리 + Google 밝은 테마. 높이는 고르는 중.
 * Apple은 글자가 높이의 43%로 고정이고(최소 높이 30), 다른 로그인 버튼보다 작으면 안 된다. Google은 높이를 정하지 않고 글자 14/20만 정한다.
 * 그래서 높이 33이면 두 글자가 14로 같고, 높이를 키울수록 Apple 글자만 커진다(38 → 약 16, 44 → 약 19).
 */
type ButtonHeight=33|38|44;
// Apple: appleid.cdn-apple.com이 그린 공식 웹 버튼 ("계속하기", ko_KR, 흰색 테두리, @2x). 화면 콘텐츠 폭(350·280)과 높이별로 받았다.
const appleButton=(width:350|280,height:ButtonHeight)=>new URL(`./assets/sign-in/apple-white-${width}-h${height}.png`,import.meta.url).href;
// Google: 공식 자산 signin-assets.zip의 로고만 있는 iOS 밝은 버튼(@4x, 44pt). 가운데 20pt G만 잘라 쓴다.
const googleLogo=new URL('./assets/sign-in/google-light@4x.png',import.meta.url).href;

function AppleButton({width,height}:{width:number;height:ButtonHeight}) {
  return <Image accessibilityRole="button" accessibilityLabel="Apple로 계속하기" source={{uri:appleButton(width>=350?350:280,height)}} style={{width,height}}/>;
}
/** Google 브랜드 가이드 밝은 테마: 흰 바탕, 테두리 #747775, 글자 #1F1F1F Google Sans Medium 14/20, iOS 여백 16·12·16, 사각형 모서리 4. */
function GoogleButton({width,height}:{width:number;height:ButtonHeight}) {
  return <View accessibilityRole="button" accessibilityLabel="Google 계정으로 계속하기" style={{width,height,borderRadius:4,backgroundColor:'#FFFFFF',borderWidth:1,borderColor:'#747775',flexDirection:'row',alignItems:'center',justifyContent:'center',paddingHorizontal:16,gap:12}}>
    <View style={{width:20,height:20,overflow:'hidden'}}>
      <Image source={{uri:googleLogo}} style={{position:'absolute',left:-12,top:-12,width:44,height:44}}/>
    </View>
    <Text allowFontScaling={false} style={{color:'#1F1F1F',fontFamily:"'Google Sans', Roboto, system-ui, sans-serif",fontWeight:'500',fontSize:14,lineHeight:20}}>Google 계정으로 계속하기</Text>
  </View>;
}

function Demo({ios=true,age=false,terms=false,height=33}:{ios?:boolean;age?:boolean;terms?:boolean;height?:ButtonHeight}) {
  const [a,setA]=useState(age);const [t,setT]=useState(terms);
  const {width}=useWindowDimensions();
  const screen=Math.min(width,390),button=screen-40;
  return <View style={{width:screen,height:844}}><ConsentScreen ageChecked={a} termsChecked={t} onToggleAge={()=>setA(!a)} onToggleTerms={()=>setT(!t)} onViewTerms={noop} onViewPrivacy={noop} onUnder14={noop} onBack={noop}
    loginButtons={<>{ios&&<AppleButton width={button} height={height}/>}<GoogleButton width={button} height={height}/></>}/></View>;
}
export const Empty:Story={name:'iOS · 체크 전',render:()=><Demo/>};
export const Ready33:Story={name:'iOS · 모두 체크 · 높이 33 (글자 같음)',render:()=><Demo age terms height={33}/>};
export const Ready38:Story={name:'iOS · 모두 체크 · 높이 38',render:()=><Demo age terms height={38}/>};
export const Ready44:Story={name:'iOS · 모두 체크 · 높이 44 (기본)',render:()=><Demo age terms height={44}/>};
export const Android:Story={name:'Android · Google만',render:()=><Demo ios={false} age terms/>};
