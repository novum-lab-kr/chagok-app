import React from 'react';
import { View } from 'react-native';
import type { Meta,StoryObj } from '@storybook/react-vite';
import { retro,PixelText,PixelButton,PixelPanel,PixelInput,StickerSlot,StickerGrid,PixelDialog,GoalSummaryCard,BoardProgressRow } from '../src/design-system';
const meta={title:'Design System/Overview',parameters:{docs:{description:{component:'Neo둥근모 실제 폰트 + 사용자 지정 팔레트. 앱과 공유하는 React Native 컴포넌트입니다. 생성 이미지 속 가상 글꼴을 흉내 내기 위해 굵기나 외곽선을 추가하지 않습니다.'}}}} satisfies Meta;
export default meta;type Story=StoryObj<typeof meta>;
export const ComponentBoard:Story={name:'공통 컴포넌트 한눈에',render:()=> <View style={{gap:32,maxWidth:1100}}>
  <View style={{gap:8}}><PixelText variant="brand">차곡차곡</PixelText><PixelText>공통 컴포넌트 · Neo둥근모 1.601 · 컬러 1.1.0</PixelText></View>
  <View style={{flexDirection:'row',flexWrap:'wrap',gap:32,alignItems:'flex-start'}}>
    <View style={{width:340,gap:20}}>
      <PixelText variant="title">목표와 적립판</PixelText>
      <GoalSummaryCard name="책 읽기" sticker="sprout" kind="적립판" percent={40} status={['40% 채웠어요']}/>
      <PixelPanel title="책 읽기"><BoardProgressRow value={6} total={15} percentLabel="40%" sticker="sprout"/><View style={{height:retro.layout.progressGridGap}}/><StickerGrid>{Array.from({length:9},(_,i)=><StickerSlot key={i} width="100%" height="100%" number={i+1} state={i<6?'filled':i===6?'available':'empty'}/>)}</StickerGrid></PixelPanel>
    </View>
    <View style={{width:340,gap:20}}><PixelText variant="title">입력과 버튼</PixelText><PixelInput label="목표 이름" defaultValue="책 읽기"/><PixelButton label="저장하기"/><PixelButton label="바꾸기" variant="secondary"/><PixelButton label="저장하기" disabled/><PixelInput label="메모" defaultValue="오늘도 한 칸을 채웠다." multiline style={{minHeight:96}}/></View>
    <View style={{width:340,gap:20}}><PixelText variant="title">튜토리얼</PixelText><PixelDialog step="3 / 5" title="빈칸에 톡!" description="어느 빈칸이든 누르면 스티커가 붙어요. 꾹 누르면 떼져요"/><PixelText>Viewport {retro.color.screen}</PixelText><PixelText>Frame {retro.color.lcd}</PixelText><PixelText>Main text {retro.color.ink}</PixelText><PixelText>Button text {retro.color.buttonText}</PixelText></View>
  </View>
</View>};
