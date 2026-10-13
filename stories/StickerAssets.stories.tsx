import React from 'react';
import {View} from 'react-native';
import type {Meta,StoryObj} from '@storybook/react-vite';
import {PixelText,StickerGlyph,toColorStickerId,retro} from '../src/design-system';
import {pocketStickers} from '../src/stickers/pocket/catalog';
const meta={title:'Stickers/Asset Library'} satisfies Meta;
export default meta;
type Story=StoryObj<typeof meta>;

export const SizeMatrix:Story={name:'24 · 48 · 72px',render:()=> <View style={{gap:24,alignSelf:'flex-start',backgroundColor:retro.color.lcd,padding:16}}>
  <View style={{flexDirection:'row',gap:16}}><View style={{width:64}}/>{[24,48,72].map(size=><PixelText key={size} style={{width:72}}>{size}px</PixelText>)}</View>
  {pocketStickers.map(item=><View key={item.id} style={{flexDirection:'row',alignItems:'center',gap:16}}><PixelText style={{width:64}}>{item.label}</PixelText>{[24,48,72].map(size=><View key={size} style={{width:72,height:72,alignItems:'center',justifyContent:'center'}}><StickerGlyph id={toColorStickerId(item.id)} size={size}/></View>)}</View>)}
</View>};
