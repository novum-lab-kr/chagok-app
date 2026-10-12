import React,{useState} from 'react';
import {Image,Text,View,useWindowDimensions} from 'react-native';
import type {Meta,StoryObj} from '@storybook/react-vite';
import {ConsentScreen} from '../src/design-system';

const meta={title:'Screens/Account consent',parameters:{layout:'fullscreen',edgeToEdge:true,docs:{description:{component:'계정 연결 직전 동의 화면 (약관 설계). 로그인 버튼은 디자인 시스템의 예외로 각 회사 공식 버튼을 쓴다. 여기 버튼은 공식 모양을 흉내 낸 미리보기다 — Apple은 Apple 서버가 그린 공식 버튼 이미지, Google은 공식 자산의 G 로고와 브랜드 가이드 값. 앱에서는 Apple 시스템 버튼(expo-apple-authentication)과 Google 가이드대로 만든 버튼을 넣는다. 앱 동작에 연결되지 않습니다.'}}}} satisfies Meta;
export default meta;
type Story=StoryObj<typeof meta>;
const noop=()=>{};

/**
 * 색은 둘 다 흰색 (2026-10-01 사용자 결정): Apple 흰색 테두리 + Google 밝은 테마.
 * 높이는 44 (2026-10-12 사용자 결정, 33·38·44 중): 탭 대상 기준 iOS 44와 맞춘다. Apple 글자는 높이의 43%라 약 19.
 * Google 글자도 19로 맞춘다 (2026-10-12 사용자 결정, 로그인 버튼 시안 B안). 로고·여백은 기본(14/20 · 로고 20)의 1.2배.
 */
type ButtonHeight=44;
// Apple: appleid.cdn-apple.com이 그린 공식 웹 버튼 ("계속하기", ko_KR, 흰색 테두리, @2x). 화면 콘텐츠 폭(350·280)과 높이별로 받았다.
const appleButton=(width:350|280,height:ButtonHeight)=>new URL(`./assets/sign-in/apple-white-${width}-h${height}.png`,import.meta.url).href;
// Google: 공식 자산 signin-assets.zip의 로고만 있는 iOS 밝은 버튼(@4x, 44pt). 가운데 20pt G만 잘라 쓴다.
const googleLogo=new URL('./assets/sign-in/google-light@4x.png',import.meta.url).href;

function AppleButton({width,height}:{width:number;height:ButtonHeight}) {
  return <Image accessibilityRole="button" accessibilityLabel="Apple로 계속하기" source={{uri:appleButton(width>=350?350:280,height)}} style={{width,height}}/>;
}
/** Google 브랜드 가이드 밝은 테마: 흰 바탕, 테두리 #747775, 글자 #1F1F1F Google Sans Medium, 사각형 모서리 4.
 * 글자 19/27 · 로고 24 · 여백 19·14·19 (기본 14/20 · 20 · 16·12·16의 1.2배, 2026-10-12 B안).
 * 버튼 폭이 모자라면(320pt 화면, 버튼 280) 글자·로고·여백을 같은 비율로 줄인다. GOOGLE_CONTENT는 1배일 때 내용 폭에 글꼴 차이 여유를 더한 값. */
const GOOGLE_CONTENT=300;
function GoogleButton({width,height}:{width:number;height:ButtonHeight}) {
  const k=Math.min(1,width/GOOGLE_CONTENT),logo=24*k,font=19*k;
  return <View accessibilityRole="button" accessibilityLabel="Google 계정으로 계속하기" style={{width,height,borderRadius:4,backgroundColor:'#FFFFFF',borderWidth:1,borderColor:'#747775',flexDirection:'row',alignItems:'center',justifyContent:'center',paddingHorizontal:19*k,gap:14*k}}>
    <View style={{width:logo,height:logo,overflow:'hidden'}}>
      <Image source={{uri:googleLogo}} style={{position:'absolute',left:-logo*0.6,top:-logo*0.6,width:logo*2.2,height:logo*2.2}}/>
    </View>
    <Text allowFontScaling={false} numberOfLines={1} style={{color:'#1F1F1F',fontFamily:"'Google Sans', Roboto, system-ui, sans-serif",fontWeight:'500',fontSize:font,lineHeight:Math.round(font*27/19)}}>Google 계정으로 계속하기</Text>
  </View>;
}

function Demo({ios=true,age=false,terms=false,height=44}:{ios?:boolean;age?:boolean;terms?:boolean;height?:ButtonHeight}) {
  const [a,setA]=useState(age);const [t,setT]=useState(terms);
  const {width}=useWindowDimensions();
  const screen=Math.min(width,390),button=screen-40;
  return <View style={{width:screen,height:844}}><ConsentScreen ageChecked={a} termsChecked={t} onToggleAge={()=>setA(!a)} onToggleTerms={()=>setT(!t)} onViewTerms={noop} onViewPrivacy={noop} onUnder14={noop} onBack={noop}
    loginButtons={<>{ios&&<AppleButton width={button} height={height}/>}<GoogleButton width={button} height={height}/></>}/></View>;
}
export const Empty:Story={name:'iOS · 체크 전',render:()=><Demo/>};
export const Ready44:Story={name:'iOS · 모두 체크',render:()=><Demo age terms/>};
export const Android:Story={name:'Android · Google만',render:()=><Demo ios={false} age terms/>};
