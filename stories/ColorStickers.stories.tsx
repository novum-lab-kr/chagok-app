import React from 'react';
import {View} from 'react-native';
import type {Meta,StoryObj} from '@storybook/react-vite';
import {PixelText,StickerGlyph,retro} from '../src/design-system';
import {colorStickerPacks,colorStickersInPack,type ColorStickerId,type ColorStickerPackId} from '../src/stickers/color/catalog';
import {ColorStickerArtwork} from '../src/stickers/color/ColorStickerArtwork';
import {pocketStickers} from '../src/stickers/pocket/catalog';

const meta={
  title:'Stickers/Color Assets',
  args:{pack:'basic' as ColorStickerPackId},
  argTypes:{pack:{name:'묶음',control:'select',options:colorStickerPacks.map(p=>p.id)}},
} satisfies Meta<{pack:ColorStickerPackId}>;
export default meta;
type Story=StoryObj<{pack:ColorStickerPackId}>;

const ink=retro.color.ink;
const caption={fontSize:12,lineHeight:16};
const packTitle=(id:ColorStickerPackId)=>{
  const pack=colorStickerPacks.find(p=>p.id===id)!;
  return `${pack.label} · ${pack.free?'무료':'유료'} · ${colorStickersInPack(id).length}종`;
};

function StickerCard({id,label}:{id:ColorStickerId;label:string}) {
  return <View style={{width:136,gap:6,alignItems:'center',padding:8,borderWidth:retro.shape.cellBorder,borderColor:ink}}>
    <ColorStickerArtwork id={id} size={96}/>
    <View style={{flexDirection:'row',alignItems:'flex-end',gap:12}}>
      <ColorStickerArtwork id={id} size={48}/><ColorStickerArtwork id={id} size={24}/>
    </View>
    <PixelText>{label}</PixelText>
    <PixelText style={caption}>{id}</PixelText>
  </View>;
}

export const AllPacks:Story={name:'전체 묶음 · 96 · 48 · 24px',render:()=> <View style={{gap:32,padding:16,backgroundColor:retro.color.lcd}}>
  {colorStickerPacks.map(pack=><View key={pack.id} style={{gap:12}}>
    <PixelText variant="title">{packTitle(pack.id)}</PixelText>
    <View style={{flexDirection:'row',flexWrap:'wrap',gap:12}}>
      {colorStickersInPack(pack.id).map(s=><StickerCard key={s.id} id={s.id as ColorStickerId} label={s.label}/>)}
    </View>
  </View>)}
</View>};

/** 판 컴포넌트를 고치지 않고, 스토리 안에서만 칸 모양을 흉내 낸다. */
export const OnBoards:Story={name:'판에 붙인 모습 (적립판 48 · 달력 24)',render:({pack})=>{
  const stickers=colorStickersInPack(pack);
  const at=(n:number)=>stickers[n%stickers.length].id as ColorStickerId;
  const cell={borderWidth:retro.shape.cellBorder,borderColor:ink,alignItems:'center',justifyContent:'center'} as const;
  return <View style={{gap:24,padding:16,alignSelf:'flex-start',backgroundColor:retro.color.screen}}>
    <PixelText variant="title">{packTitle(pack)}</PixelText>
    <View style={{gap:8}}>
      <PixelText>적립판 · 스티커 48px</PixelText>
      <View style={{flexDirection:'row',flexWrap:'wrap',width:5*60,backgroundColor:retro.color.lcd}}>
        {Array.from({length:20},(_,n)=><View key={n} style={[cell,{width:60,height:60}]}>
          {n<14?<ColorStickerArtwork id={at(n)} size={48}/>:<PixelText style={caption}>{n+1}</PixelText>}
        </View>)}
      </View>
    </View>
    <View style={{gap:8}}>
      <PixelText>달력 · 스티커 24px</PixelText>
      <View style={{flexDirection:'row',flexWrap:'wrap',width:7*44,backgroundColor:retro.color.lcd}}>
        {Array.from({length:28},(_,n)=><View key={n} style={[cell,{width:44,height:48,justifyContent:'flex-start',paddingTop:2,gap:2}]}>
          <PixelText style={caption}>{n+1}</PixelText>
          {n%3!==2&&<ColorStickerArtwork id={at(n)} size={24}/>}
        </View>)}
      </View>
    </View>
  </View>;
}};

export const MonoComparison:Story={name:'흑백(현재) · 컬러 기본 비교',render:()=> <View style={{gap:16,padding:16,alignSelf:'flex-start',backgroundColor:retro.color.lcd}}>
  <View style={{flexDirection:'row',gap:16}}><View style={{width:72}}/><PixelText style={{width:56}}>흑백</PixelText><PixelText style={{width:56}}>컬러</PixelText></View>
  {pocketStickers.map(mono=><View key={mono.id} style={{flexDirection:'row',alignItems:'center',gap:16}}>
    <PixelText style={{width:72}}>{mono.label}</PixelText>
    <StickerGlyph id={mono.id} size={48}/>
    <View style={{width:56}}><ColorStickerArtwork id={`basic.${mono.id}`} size={48}/></View>
  </View>)}
</View>};
