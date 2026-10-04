import React from 'react';
import {View} from 'react-native';
import type {Meta,StoryObj} from '@storybook/react-vite';
import {Mascot,PixelText,mascotBlockStates,mascotFaces,mascotVariants,retro} from '../src/design-system';
import type {MascotPose} from '../src/design-system';

const meta={title:'Brand/Mascot',parameters:{docs:{description:{component:'메인 캐릭터 「차곡이」. 원본은 docs/design/character/character-data.json. 표정 쓰임새는 2026-10-04 확정(PRD 4.11).'}}}} satisfies Meta;
export default meta;
type Story=StoryObj<typeof meta>;

// 쓰임새는 docs/design/character/README.md 표 그대로(2026-10-04 확정).
const poseLabel:Record<MascotPose,string>={
  basic:'기본 · 앱 머리글, 평소',smile:'미소 · 스티커를 붙였을 때',grin:'활짝 · 새 목표를 만들었을 때',excited:'신남 · 판을 완성했을 때',
  surprised:'놀람 · 칸을 늘리거나 이어 쓸 때',sleepy:'졸림 · 목표가 하나도 없을 때',wink:'윙크 · 튜토리얼을 마쳤을 때',sparkle:'반짝 · 새 스티커·새 기능',
  shy:'수줍 · 사진·메모를 남겼을 때',curious:'갸웃 · 연결이 필요하거나 안 될 때',
  sleepyBubble:'숨방울 · 나중에 쓸 졸림 변형',armsDotSide:'점 팔 1 · 옆으로',armsDotDown:'점 팔 2 · 아래로',
  b0:'판 0장',b1:'판 1장',b2:'판 2장',b3:'판 3장',
};
const ground={backgroundColor:retro.color.screen,padding:16,gap:16,alignSelf:'flex-start' as const};

function Cell({pose,size=96}:{pose:MascotPose;size?:number}) {
  return <View style={{width:160,gap:8,alignItems:'center'}}>
    <Mascot pose={pose} size={size}/>
    <PixelText variant="caption" style={{textAlign:'center'}}>{pose}</PixelText>
    <PixelText variant="caption" style={{textAlign:'center'}}>{poseLabel[pose]}</PixelText>
  </View>;
}
function Grid({poses,size}:{poses:readonly MascotPose[];size?:number}) {
  return <View style={{...ground,flexDirection:'row',flexWrap:'wrap',maxWidth:900}}>{poses.map(p=><Cell key={p} pose={p} size={size}/>)}</View>;
}

export const Faces:Story={name:'표정 10가지',render:()=><Grid poses={mascotFaces}/>};
export const Blocks:Story={name:'머리 위 판 0~3장',render:()=><Grid poses={mascotBlockStates}/>};
export const Variants:Story={name:'변형 · 숨방울 · 점 팔',render:()=><Grid poses={mascotVariants}/>};

const sizes=[24,48,72,96,168];
export const Sizes:Story={name:'크기 24 · 48 · 72 · 96 · 168px',render:()=> <View style={ground}>
  <PixelText variant="caption">24칸 그림이라 24의 배수에서 칸이 고르게 보입니다.</PixelText>
  {(['basic','smile','sleepy'] as const).map(pose=><View key={pose} style={{flexDirection:'row',alignItems:'flex-end',gap:16}}>
    <PixelText style={{width:64}}>{pose}</PixelText>
    {sizes.map(size=><Mascot key={size} pose={pose} size={size}/>)}
  </View>)}
</View>};

// 앱 아이콘 1안: 민트 1024 바탕에 칸당 36px, 왼쪽 위 (80, 60).
function IconPreview({size}:{size:number}) {
  const scale=size/1024;
  return <View style={{width:size,height:size,borderRadius:size*0.2237,overflow:'hidden',backgroundColor:retro.color.screen,borderWidth:1,borderColor:retro.color.ink}}>
    <View style={{position:'absolute',left:80*scale,top:60*scale}}><Mascot size={36*24*scale}/></View>
  </View>;
}
export const AppIcon:Story={name:'앱 아이콘 1안 미리보기',render:()=> <View style={{...ground,backgroundColor:retro.color.secondary}}>
  <PixelText variant="caption">iOS 모서리 모양을 흉내 낸 미리보기입니다. 실제 아이콘 파일은 아직 만들지 않았습니다.</PixelText>
  <View style={{flexDirection:'row',alignItems:'flex-end',gap:24}}>{[180,120,60].map(s=><IconPreview key={s} size={s}/>)}</View>
</View>};
