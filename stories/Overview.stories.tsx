import React from 'react';
import { View } from 'react-native';
import type { Meta,StoryObj } from '@storybook/react-vite';
import { retro,PixelText,PixelButton,PixelPanel,PixelInput,GoalChip,DefaultStickerLink,StickerSlot,StickerGrid,PixelDialog } from '../src/design-system';
const meta={title:'Design System/Overview',parameters:{docs:{description:{component:'Neo둥근모 실제 폰트 + 사용자 지정 팔레트. 앱과 공유하는 React Native 컴포넌트입니다. 생성 이미지 속 가상 글꼴을 흉내 내기 위해 굵기나 외곽선을 추가하지 않습니다.'}}}} satisfies Meta;
export default meta;type Story=StoryObj<typeof meta>;
export const ComponentBoard:Story={name:'공통 컴포넌트 한눈에',render:()=> <View style={{gap:32,maxWidth:1100}}>
  <View style={{gap:8}}><PixelText variant="brand">차곡차곡</PixelText><PixelText>공통 컴포넌트 · Neo둥근모 1.601 · 컬러 1.1.0</PixelText></View>
  <View style={{flexDirection:'row',flexWrap:'wrap',gap:32,alignItems:'flex-start'}}>
    <View style={{width:340,gap:20}}>
      <PixelText variant="title">목표와 적립판</PixelText>
      <View style={{flexDirection:'row',gap:12}}><GoalChip label="책 읽기" value={6} total={15} selected/><GoalChip label="산책" value={7} total={30}/></View>
      <PixelPanel title="책 읽기"><View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:16}}><PixelText variant="number">6 / 15</PixelText><DefaultStickerLink/></View><StickerGrid>{Array.from({length:9},(_,i)=><StickerSlot key={i} width="100%" height="100%" number={i+1} state={i<6?'filled':i===6?'available':'empty'}/>)}</StickerGrid></PixelPanel>
    </View>
    <View style={{width:340,gap:20}}><PixelText variant="title">입력과 버튼</PixelText><PixelInput label="목표 이름" defaultValue="책 읽기"/><PixelButton label="저장하기"/><PixelButton label="바꾸기" variant="secondary"/><PixelButton label="저장하기" disabled/><PixelInput label="메모" defaultValue="오늘도 한 칸을 채웠다." multiline style={{minHeight:96}}/></View>
    <View style={{width:340,gap:20}}><PixelText variant="title">튜토리얼</PixelText><PixelDialog step="3 / 3" title="빈칸에 톡!" description="누르면 스티커가 붙어요" primaryLabel="시작하기"/><PixelText>Viewport {retro.color.screen}</PixelText><PixelText>Frame {retro.color.lcd}</PixelText><PixelText>Main text {retro.color.ink}</PixelText><PixelText>Button text {retro.color.buttonText}</PixelText></View>
  </View>
</View>};
export const Reference:Story={name:'기준 시안 · 비교용',render:()=> <div style={{maxWidth:420}}><PixelText>이미지는 구성·프레임 비교용입니다. 색상은 사용자 지정값, 글씨는 실제 Neo둥근모가 기준입니다.</PixelText><img src="/reference/01-home.png" alt="v6 홈 기준 시안" style={{width:'100%',marginTop:20}}/></div>};
