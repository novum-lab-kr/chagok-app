import React from 'react';
import { View } from 'react-native';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { retro, PixelText, PixelFrame, StickerGlyph, type TextVariant } from '../src/design-system';
const meta = {title:'Foundations/Tokens',parameters:{docs:{description:{component:'사용자가 지정한 팔레트 6색과 Neo둥근모 v1.601 실제 렌더링. 모든 앱 글씨는 Regular 400이며 합성 굵게 처리를 하지 않습니다.'}}}} satisfies Meta;
export default meta;
type Story=StoryObj<typeof meta>;
export const Colors:Story={name:'색상 · 사용자 지정값',render:()=> <View style={{gap:24,maxWidth:840}}><PixelText variant="brand">고정 컬러</PixelText><View style={{flexDirection:'row',flexWrap:'wrap',gap:20}}>{[
  ['Viewport',retro.color.screen],['Main frame',retro.color.lcd],['Primary',retro.color.primary],['Secondary / Dialog',retro.color.secondary],['Main text / Frame',retro.color.ink],['Button text',retro.color.buttonText],
].map(([name,hex])=><View key={name} style={{width:240,gap:8}}><View style={{height:96,backgroundColor:hex,borderColor:retro.color.ink,borderWidth:1}}/><PixelText>{name}</PixelText><PixelText selectable>{hex}</PixelText></View>)}</View></View>};
export const Typography:Story={name:'글씨 · 한글 / 영문 / 숫자',render:()=> <View style={{maxWidth:760,gap:28}}><PixelText variant="brand">Neo둥근모</PixelText>{(Object.keys(retro.typography) as TextVariant[]).map(role=><View key={role} style={{gap:8}}><PixelText>{role} · {retro.typography[role].fontSize}/{retro.typography[role].lineHeight} · Regular 400</PixelText><PixelText variant={role}>차곡차곡 책 읽기 기본 스티커</PixelText><PixelText variant={role}>Aa Bb Cc · 0123456789 · 6 / 15</PixelText></View>)}</View>};
export const Frames:Story={name:'도트 프레임',render:()=> <View style={{maxWidth:420,gap:24}}>{(['panel','button','input','dialog','slot'] as const).map(variant=><PixelFrame key={variant} variant={variant} fill={variant==='panel'||variant==='slot'?retro.color.lcd:retro.color.secondary} contentStyle={{padding:24}}><PixelText>{variant}</PixelText></PixelFrame>)}</View>};
export const StickerMaster:Story={name:'새싹이 · 공통 원본',render:()=> <View style={{gap:24,maxWidth:620}}><PixelText variant="title">하나의 원본, 같은 얼굴</PixelText><PixelText>24 / 48 / 72 / 96px · 얼굴 배경은 투명</PixelText>{[retro.color.lcd,retro.color.screen,retro.color.secondary].map(bg=><View key={bg} style={{backgroundColor:bg,padding:20,flexDirection:'row',gap:20,alignItems:'center'}}>{[24,48,72,96].map(size=><StickerGlyph key={size} id="basic.sprout" size={size}/>)}</View>)}<PixelText>앱의 기본 스티커와 같은 컬러 원본(basic.sprout)입니다. 24칸 도트라 24의 배수로만 그립니다.</PixelText></View>};
