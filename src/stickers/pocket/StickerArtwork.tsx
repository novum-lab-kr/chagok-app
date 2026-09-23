import React from 'react';
import {Platform} from 'react-native';
import Svg,{Path} from 'react-native-svg';
import {getPocketSticker,type PocketStickerId} from './catalog';

/** Theme-independent, transparent artwork. Screens supply size and ink color. */
export function StickerArtwork({id,size=56,color}:{id:PocketStickerId;size?:number;color:string}) {
  const {label,asset}=getPocketSticker(id);
  const accessibility=Platform.OS==='web'
    ? {role:'img','aria-label':label} as const
    : {accessible:true,accessibilityLabel:label};
  return <Svg width={size} height={size} viewBox={asset.viewBox} {...accessibility}>
    <Path d={asset.path} fill={color}/>
  </Svg>;
}
