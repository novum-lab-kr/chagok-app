import React from 'react';
import { Platform } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { retro } from './tokens';
import { StickerArtwork } from '../stickers/pocket/StickerArtwork';
import type { PocketStickerId } from '../stickers/pocket/catalog';
export { pocketStickers, stickerLabel } from '../stickers/pocket/catalog';
export type { PocketStickerId } from '../stickers/pocket/catalog';

/** Design-system adapter; artwork and metadata live in the sticker library. */
export function StickerGlyph({id,size=48}:{id:PocketStickerId;size?:number}) {
  return <StickerArtwork id={id} size={size} color={retro.color.ink}/>;
}
export type ActionSymbolName='back'|'check'|'photo'|'trash'|'minus';
export function ActionSymbol({name,size=20,color=retro.color.ink}:{name:ActionSymbolName;size?:number;color?:string}) {
  const symbols={back:'M10 1H13V4H10V7H7V10H10V13H13V16H10V13H7V10H4V7H7V4H10Z',check:'M1 8H4V11H7V8H10V5H13V2H16V6H13V9H10V12H7V15H4V12H1Z',photo:'M0 1H16V15H0Z M2 3V11L6 7L10 11L12 9L14 11V3Z M10 4H13V7H10Z',trash:'M5 0H11V2H15V4H1V2H5Z M3 5H13V16H3Z M5 7V14H6V7Z M10 7V14H11V7Z',minus:'M2 6H14V10H2Z'};
  return <Svg width={size} height={size} viewBox="0 0 16 16" {...(Platform.OS==='web'?{'aria-hidden':true}:{accessible:false})}><Path d={symbols[name]} fill={color} fillRule="evenodd"/></Svg>;
}
