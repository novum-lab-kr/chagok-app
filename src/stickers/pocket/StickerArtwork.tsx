import React from 'react';
import {Platform} from 'react-native';
import Svg,{Path} from 'react-native-svg';
import {getPocketSticker,type PocketStickerId} from './catalog';
import {stickerName} from '../../i18n/stickerNames';

/** Theme-independent, transparent artwork. Screens supply size and ink color. */
export function StickerArtwork({id,size=56,color}:{id:PocketStickerId;size?:number;color:string}) {
  const {label:korean,asset}=getPocketSticker(id);
  const label=stickerName(id,korean);
  const accessibility=Platform.OS==='web'
    ? {role:'img','aria-label':label} as const
    : {accessible:true,accessibilityLabel:label};
  return <Svg width={size} height={size} viewBox={asset.viewBox} {...accessibility}>
    <Path d={asset.path} fill={color}/>
  </Svg>;
}
