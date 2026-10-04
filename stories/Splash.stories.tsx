import React,{useState} from 'react';
import {Pressable,View} from 'react-native';
import type {Meta,StoryObj} from '@storybook/react-vite';
import {PixelText,SplashAnimation,retro,splashTimeline} from '../src/design-system';

const meta={title:'Brand/Splash',parameters:{docs:{description:{component:'스플래시 S2-B (2026-10-04 확정). OS 정지 화면(윤곽선만 있는 몸)에서 이어받아 색 채우기 → 판 세 장 낙하(캐릭터가 두 칸씩 좌우로 받음) → "차곡차곡" 한 자씩 + 커서. 기준: docs/design/character/README.md 「스플래시」. 앱 시작 흐름에는 아직 연결하지 않았다.'}}}} satisfies Meta;
export default meta;
type Story=StoryObj<typeof meta>;

/** iPhone 16 Pro 화면(393×852pt)을 scale 배율로 줄여 보인다. */
function Phone({scale=0.5,children}:{scale?:number;children:React.ReactNode}) {
  const W=393,H=852;
  return <View style={{width:W*scale,height:H*scale,overflow:'hidden',borderRadius:28*scale,borderWidth:1,borderColor:retro.color.ink}}>
    <View style={{width:W,height:H,transform:[{translateX:-W*(1-scale)/2},{translateY:-H*(1-scale)/2},{scale}]}}>{children}</View>
  </View>;
}
const total=splashTimeline().total;

function Player() {
  const [run,setRun]=useState(0);
  const [done,setDone]=useState(false);
  return <View style={{padding:16,gap:12,alignItems:'flex-start'}}>
    <Phone scale={0.6}><SplashAnimation key={run} reduceMotion={false} onDone={()=>setDone(true)}/></Phone>
    <View style={{flexDirection:'row',gap:12,alignItems:'center'}}>
      <Pressable accessibilityRole="button" onPress={()=>{setDone(false);setRun(r=>r+1);}} style={{borderWidth:2,borderColor:retro.color.ink,paddingHorizontal:10,paddingVertical:4,backgroundColor:retro.color.secondary}}>
        <PixelText>처음부터 다시</PixelText>
      </Pressable>
      <PixelText>{done?'끝 → 여기서 첫 화면으로 넘어간다':`재생 중 · 약 ${(total/1000).toFixed(1)}초`}</PixelText>
    </View>
  </View>;
}
export const Play:Story={name:'재생',render:()=><Player/>};

const ev=splashTimeline().events;
const when=(f:(e:typeof ev[number])=>boolean)=>ev.find(f)!.t;
const stills:[number,string][]=[
  [0,'OS 정지 화면과 같은 첫 장면'],[when(e=>e.fill===16),'아래에서 위로 색 채우기'],
  [when(e=>e.falling===0&&e.dy===4),'첫 판 · 왼쪽으로 받으러'],[when(e=>e.falling===1&&e.dy===4),'두 번째 판 · 오른쪽으로'],
  [when(e=>e.falling===2&&e.dy===4),'세 번째 판 · 가운데로'],[when(e=>e.text===2),'한 자씩 + 커서'],[total,'마지막 장면'],
];
export const Frames:Story={name:'장면별',render:()=><View style={{padding:16,flexDirection:'row',flexWrap:'wrap',gap:16}}>
  {stills.map(([t,label])=><View key={t} style={{gap:6}}><Phone scale={0.36}><SplashAnimation at={t}/></Phone><PixelText style={{fontSize:13,lineHeight:18}}>{`${(t/1000).toFixed(2)}초 · ${label}`}</PixelText></View>)}
</View>};
export const Reduced:Story={name:'모션 줄이기',render:()=><View style={{padding:16,gap:8}}>
  <Phone scale={0.5}><SplashAnimation reduceMotion/></Phone>
  <PixelText style={{fontSize:13,lineHeight:18}}>마지막 장면만 보여 주고 바로 넘어간다</PixelText>
</View>};
