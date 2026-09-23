import React, { useState } from 'react';
import { View, Pressable } from 'react-native';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { retro, PixelText, PixelPanel, PixelButton, PixelIcon, GoalChip, DefaultStickerLink, StickerSlot, PixelDialog, SproutSticker, PixelFocusRing, StickerGrid } from '../src/design-system';

const meta = { title: 'Design System/Reference Match', parameters: { layout: 'fullscreen', edgeToEdge: true } } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

function ReferenceHome() {
  const [goal, setGoal] = useState('책 읽기');
  const [count, setCount] = useState(6);
  const [dialog, setDialog] = useState(false);
  return <View style={{width:390,maxWidth:'100%',backgroundColor:retro.color.screen,padding:20,gap:12}}>
    <View style={{flexDirection:'row',alignItems:'center',gap:10,paddingVertical:0,height:44}}>
      <PixelIcon name="flower" size={44}/><PixelText variant="brand">차곡차곡</PixelText>
      <PixelText variant="title" style={{marginLeft:'auto'}}>9월</PixelText>
    </View>
    <View style={{flexDirection:'row',gap:8,alignItems:'stretch'}}>
      <GoalChip label="책 읽기" value={count} total={15} selected={goal==='책 읽기'} onPress={()=>setGoal('책 읽기')} style={{flex:1,width:undefined}}/>
      <GoalChip label="산책" value={7} total={30} selected={goal==='산책'} onPress={()=>setGoal('산책')} style={{flex:1,width:undefined}}/>
      <PixelButton label="" accessibilityLabel="목표 추가" variant="secondary" minHeight={56} icon={<PixelIcon name="plus" size={20}/>} onPress={()=>setDialog(true)} style={{width:52}}/>
    </View>
    <PixelPanel title={goal} action={<Pressable accessibilityRole="button" accessibilityLabel="목표 설정" onPress={()=>setDialog(true)} style={{width:40,height:40,alignItems:'center',justifyContent:'center'}}><PixelIcon name="gear" size={36}/></Pressable>}>
      <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:retro.layout.progressGridGap}}>
        <PixelText variant="number">{goal==='책 읽기'?count:7} / {goal==='책 읽기'?15:30}</PixelText><DefaultStickerLink onPress={()=>setDialog(true)}/>
      </View>
      <StickerGrid>
        {Array.from({length:15},(_,i)=><StickerSlot key={i} width="100%" height="100%" number={i+1} state={i<(goal==='책 읽기'?count:7)?'filled':i===(goal==='책 읽기'?count:7)?'available':'empty'} onPress={()=>{if(goal==='책 읽기'&&i===count)setCount(n=>n+1)}}/>)}
      </StickerGrid>
    </PixelPanel>
    {dialog && <PixelDialog step="미리보기" title="프레임 확인" description="버튼과 팝업의 도트 형태를 확인해요." primaryLabel="닫기" secondaryLabel="돌아가기" onPrimary={()=>setDialog(false)} onSecondary={()=>setDialog(false)}/>}
  </View>;
}

export const Home: Story = { name: '시안 기준 · 홈 구성', render: () => <ReferenceHome/> };
export const SideBySide: Story = { name: '시안과 나란히 비교', render: () => <View style={{gap:16}}>
  <PixelText>형태 비교 · 지정 컬러와 현재 폰트 유지</PixelText>
  <View style={{flexDirection:'row',flexWrap:'wrap',gap:32,alignItems:'flex-start'}}>
    <View style={{width:390,gap:12}}><PixelText>공통 컴포넌트</PixelText><ReferenceHome/></View>
    <View style={{width:390,gap:12}}><PixelText>기준 시안 v6 · 화면 폭 390px 환산</PixelText><div style={{width:390,height:724,overflow:'hidden',position:'relative'}}><img src="/reference/01-home.png" alt="폰 외곽을 제외하고 앱 화면 폭을 390px로 맞춘 v6 시안" style={{position:'absolute',width:1024*390/690,maxWidth:'none',left:-168*390/690,top:-122*390/690}}/></div></View>
  </View>
</View> };

// Detail review uses identical optical scale, independent of phone mockup dimensions.
function ReferenceCrop({x,y,width,height,source='/reference/01-home.png',zoom=3}: {x:number;y:number;width:number;height:number;source?:string;zoom?:number}) {
  const scale=390/690*zoom;
  return <div style={{position:'relative',overflow:'hidden',width:Math.round(width*scale),height:Math.round(height*scale)}}>
    <img src={source} alt="시안 원본 확대" style={{position:'absolute',maxWidth:'none',width:1024*scale,left:-x*scale,top:-y*scale}}/>
  </div>;
}
export const FrameDetails: Story = {name:'선 두께 · 모서리 확대 비교',render:()=> <div style={{padding:24,display:'flex',gap:40,alignItems:'flex-start'}}>
  <div><PixelText>시안 · 화면 환산 후 3배</PixelText><ReferenceCrop x={196} y={380} width={100} height={140}/><ReferenceCrop x={434} y={860} width={163} height={129}/><ReferenceCrop x={201} y={254} width={262} height={119}/><PixelText>새싹 · 별도 지정 원본</PixelText><ReferenceCrop x={290} y={620} width={90} height={94} source={new URL('../docs/design/retro-pocket-v1/revisions/v6/references/sprout-and-label-source.png', import.meta.url).href}/></div>
  <div><PixelText>공통 컴포넌트 · 3배</PixelText>
    <div style={{width:170,height:238,overflow:'hidden'}}><div style={{transform:'scale(3)',transformOrigin:'top left',width:350}}><PixelPanel title="책 읽기"><View style={{height:440}}/></PixelPanel></div></div>
    <div style={{width:277,height:219,padding:9,boxSizing:'border-box'}}><div style={{transform:'scale(3)',transformOrigin:'top left',width:85}}><StickerSlot number={8} width={85} height={65}/></div></div>
    <div style={{width:444,height:202,padding:9,boxSizing:'border-box'}}><div style={{transform:'scale(3)',transformOrigin:'top left',width:140}}><GoalChip label="책 읽기" value={6} total={15} selected style={{width:140}}/></div></div>
    <div style={{width:168,height:168}}><div style={{transform:'scale(3)',transformOrigin:'top left'}}><SproutSticker size={56}/></div></div>
  </div>
</div>};

export const FocusDetails: Story = {name:'7번째 포커스 · 공통 기준',render:()=> <View style={{padding:24,gap:28}}>
  <PixelText>7번째 칸 · 실제 표시 크기 (100%)</PixelText>
  <View style={{flexDirection:'row',gap:32,alignItems:'flex-start'}}><View style={{gap:8}}><PixelText>시안</PixelText><ReferenceCrop x={252} y={856} width={168} height={132} zoom={1}/></View><View style={{gap:8}}><PixelText>공통 컴포넌트</PixelText><View style={{padding:4}}><StickerSlot number={7} state="available" width={85} height={65}/></View></View></View>
  <PixelText>세부 모양 · 3배 비교</PixelText>
  <View style={{flexDirection:'row',gap:32,alignItems:'flex-start'}}>
    <View style={{gap:12}}><PixelText>시안</PixelText><ReferenceCrop x={252} y={856} width={168} height={132}/></View>
    <View style={{gap:12}}><PixelText>공통 PixelFocusRing</PixelText><div style={{width:285,height:224,padding:12,boxSizing:'border-box'}}><div style={{transform:'scale(3)',transformOrigin:'top left',width:85}}><StickerSlot number={7} state="available" width={85} height={65}/></div></div></View>
  </View>
  <PixelText>재사용 · 크기가 달라도 같은 모서리와 선 두께</PixelText>
  <View style={{flexDirection:'row',alignItems:'flex-start',gap:24,flexWrap:'wrap'}}>
    <StickerSlot number={7} state="available"/>
    <View style={{width:160,height:96,backgroundColor:retro.color.lcd,alignItems:'center',justifyContent:'center'}}><PixelText>160 × 96</PixelText><PixelFocusRing/></View>
    <View style={{width:220,height:120,backgroundColor:retro.color.secondary,alignItems:'center',justifyContent:'center'}}><PixelText>220 × 120</PixelText><PixelFocusRing/></View>
  </View>
  <PixelText>모서리 15 · 굵기 8 · 절삭 2 · 선 3 · 안쪽 2 · 끊김 3px</PixelText>
</View>};

export const ControlsActualSize: Story = {name:'상단 버튼 · 100% 비교',render:()=> <View style={{padding:24,gap:20}}>
  <PixelText>실제 표시 배율 100% · 상단 버튼과 목표 박스</PixelText>
  <PixelText>시안 · 폰 화면 폭 390px 환산</PixelText>
  <ReferenceCrop x={200} y={255} width={628} height={120} zoom={1}/>
  <PixelText>공통 컴포넌트 · CSS 확대 없음</PixelText>
  <View style={{width:350,flexDirection:'row',gap:8,alignItems:'stretch'}}>
    <GoalChip label="책 읽기" value={6} total={15} selected style={{width:141}}/>
    <GoalChip label="산책" value={7} total={30} style={{width:141}}/>
    <PixelButton label="" accessibilityLabel="목표 추가" minHeight={56} variant="secondary" icon={<PixelIcon name="plus" size={20}/>} style={{width:52}}/>
  </View>
  <PixelText>공통 버튼 · 실제 크기</PixelText>
  <View style={{width:350,gap:16}}><PixelButton label="저장하기"/><PixelButton label="건너뛰기" variant="secondary"/></View>
</View>};

export const GearDetails: Story = {name:'톱니바퀴 · 100% 비교',render:()=> <View style={{padding:24,gap:20}}>
  <PixelText>목표 설정 · 실제 배율 100%</PixelText>
  <View style={{flexDirection:'row',gap:32}}><View style={{gap:8}}><PixelText>시안</PixelText><ReferenceCrop x={717} y={437} width={64} height={64} zoom={1}/></View><View style={{gap:8}}><PixelText>공통 PixelIcon</PixelText><PixelIcon name="gear" size={36}/></View></View>
  <PixelText>톱니 방향 · 중심 구멍 확인 (3배)</PixelText>
  <View style={{flexDirection:'row',gap:32}}><ReferenceCrop x={717} y={437} width={64} height={64}/><View style={{width:108,height:108}}><div style={{transform:'scale(3)',transformOrigin:'top left'}}><PixelIcon name="gear" size={36}/></div></View></View>
</View>};

export const SproutDetails: Story = {name:'기본 스티커 · 새싹과 여백 비교',render:()=> <View style={{padding:24,gap:20}}>
  <PixelText>기본 스티커 영역 · 100%</PixelText>
  <View style={{gap:12}}><PixelText>지정 시안</PixelText><ReferenceCrop x={537} y={526} width={239} height={66} zoom={1} source={new URL('../docs/design/retro-pocket-v1/revisions/v6/references/sprout-and-label-source.png',import.meta.url).href}/><PixelText>공통 컴포넌트</PixelText><View style={{alignSelf:'flex-start',backgroundColor:retro.color.lcd}}><DefaultStickerLink/></View></View>
  <PixelText>같은 새싹 원본 · 미리보기 / 칸 / 설정</PixelText>
  <View style={{flexDirection:'row',gap:24,alignItems:'center',backgroundColor:retro.color.lcd,padding:12,alignSelf:'flex-start'}}><SproutSticker size={32}/><StickerSlot number={1} state="filled"/><SproutSticker size={72}/></View>
  <PixelText>칸 내부 배치 · 100%</PixelText>
  <View style={{flexDirection:'row',gap:24}}><ReferenceCrop x={259} y={601} width={154} height={119} zoom={1}/><StickerSlot number={1} state="filled"/></View>
</View>};
