import React from 'react';
import {View} from 'react-native';
import type {Meta,StoryObj} from '@storybook/react-vite';
import {PixelText,StickerGlyph,retro} from '../src/design-system';
import {pocketStickers} from '../src/stickers/pocket/catalog';
const sproutReference=new URL('../docs/design/retro-pocket-v1/revisions/v6/references/sprout-and-label-source.png',import.meta.url).href;
const settingsReference=new URL('../docs/design/retro-pocket-v1/review-set-02/screens/04-goal-settings.png',import.meta.url).href;
const meta={title:'Stickers/Asset Library'} satisfies Meta;
export default meta;
type Story=StoryObj<typeof meta>;

function Reference({item}:{item:typeof pocketStickers[number]}) {
  const [x,y,w,h]=item.asset.source.crop;
  const scale=item.id==='sprout'?1:56/Math.max(w,h);
  return <div style={{position:'relative',overflow:'hidden',width:56,height:56}}>
    <div style={{position:'absolute',overflow:'hidden',width:w*scale,height:h*scale,left:(56-w*scale)/2,top:(56-h*scale)/2}}><img alt={`${item.label} 시안`} src={item.id==='sprout'?sproutReference:settingsReference} style={{position:'absolute',width:1024*scale,maxWidth:'none',left:-x*scale,top:-y*scale}}/></div>
  </div>;
}
export const ReferenceComparison:Story={name:'시안 · 공통 자산 100%',render:()=> <View style={{gap:24,alignSelf:'flex-start',backgroundColor:retro.color.lcd,padding:16}}>
  <PixelText>시안 / 공통 자산 · 100% 크기</PixelText>
  {pocketStickers.map(item=><View key={item.id} style={{flexDirection:'row',alignItems:'center',gap:24}}><PixelText style={{width:64}}>{item.label}</PixelText><Reference item={item}/><StickerGlyph id={item.id} size={56}/></View>)}
</View>};
export const SizeMatrix:Story={name:'32 · 48 · 56 · 64px',render:()=> <View style={{gap:24,alignSelf:'flex-start',backgroundColor:retro.color.lcd,padding:16}}>
  <View style={{flexDirection:'row',gap:16}}><View style={{width:64}}/>{[32,48,56,64].map(size=><PixelText key={size} style={{width:64}}>{size}px</PixelText>)}</View>
  {pocketStickers.map(item=><View key={item.id} style={{flexDirection:'row',alignItems:'center',gap:16}}><PixelText style={{width:64}}>{item.label}</PixelText>{[32,48,56,64].map(size=><View key={size} style={{width:64,height:64,alignItems:'center',justifyContent:'center'}}><StickerGlyph id={item.id} size={size}/></View>)}</View>)}
</View>};
