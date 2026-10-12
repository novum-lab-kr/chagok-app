import React from 'react';
import {View} from 'react-native';
import type {Meta,StoryObj} from '@storybook/react-vite';
import {PixelText,StickerGlyph,toColorStickerId,retro} from '../src/design-system';
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
export const ReferenceComparison:Story={name:'옛 흑백 시안 → 지금 컬러 · 100%',render:()=> <View style={{gap:24,alignSelf:'flex-start',backgroundColor:retro.color.lcd,padding:16}}>
  <PixelText>옛 흑백 시안 / 지금 컬러 · 100% 크기</PixelText>
  {pocketStickers.map(item=><View key={item.id} style={{flexDirection:'row',alignItems:'center',gap:24}}><PixelText style={{width:64}}>{item.label}</PixelText><Reference item={item}/><StickerGlyph id={toColorStickerId(item.id)} size={48}/></View>)}
</View>};
export const SizeMatrix:Story={name:'24 · 48 · 72px',render:()=> <View style={{gap:24,alignSelf:'flex-start',backgroundColor:retro.color.lcd,padding:16}}>
  <View style={{flexDirection:'row',gap:16}}><View style={{width:64}}/>{[24,48,72].map(size=><PixelText key={size} style={{width:72}}>{size}px</PixelText>)}</View>
  {pocketStickers.map(item=><View key={item.id} style={{flexDirection:'row',alignItems:'center',gap:16}}><PixelText style={{width:64}}>{item.label}</PixelText>{[24,48,72].map(size=><View key={size} style={{width:72,height:72,alignItems:'center',justifyContent:'center'}}><StickerGlyph id={toColorStickerId(item.id)} size={size}/></View>)}</View>)}
</View>};
