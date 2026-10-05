import React from 'react';
import {Platform} from 'react-native';
import Svg,{Path} from 'react-native-svg';
import {getColorSticker,type ColorStickerId} from './catalog';

/** 24칸 도트 그림. 칸이 흐려지지 않게 24의 정수배 크기(24·48·72·96)로 쓴다. */
export function ColorStickerArtwork({id,size=48}:{id:ColorStickerId;size?:number}) {
  const {label,layers}=getColorSticker(id);
  const accessibility=Platform.OS==='web'
    ? {role:'img','aria-label':label} as const
    : {accessible:true,accessibilityLabel:label};
  return <Svg width={size} height={size} viewBox="0 0 24 24" {...accessibility}>
    {layers.map(layer=><Path key={layer.color} d={layer.d} fill={layer.color}/>)}
  </Svg>;
}
