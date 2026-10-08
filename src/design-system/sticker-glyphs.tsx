import React from 'react';
import { Platform } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { retro } from './tokens';
import { StickerArtwork } from '../stickers/pocket/StickerArtwork';
import { getPocketSticker, type PocketStickerId } from '../stickers/pocket/catalog';
import { ColorStickerArtwork } from '../stickers/color/ColorStickerArtwork';
import { getColorSticker, type ColorStickerId } from '../stickers/color/catalog';
export { pocketStickers } from '../stickers/pocket/catalog';
export type { PocketStickerId } from '../stickers/pocket/catalog';
export type { ColorStickerId } from '../stickers/color/catalog';

/** 흑백(예전 6종)과 컬러(`묶음.이름`)를 함께 받는다. 앱은 스키마 v6 전까지 흑백 ID를 넘긴다 (2026-10-08). */
export type StickerId=PocketStickerId|ColorStickerId;
export const isColorStickerId=(id:StickerId):id is ColorStickerId=>id.includes('.');
/** 흑백 6종은 기본 묶음에 같은 그림이 있다. */
export const toColorStickerId=(id:PocketStickerId)=>`basic.${id}` as ColorStickerId;
export const stickerLabel=(id:StickerId)=>isColorStickerId(id)?getColorSticker(id).label:getPocketSticker(id).label;

/** Design-system adapter; artwork and metadata live in the sticker library. 컬러는 24칸 도트라 24의 배수로만 그린다. */
export function StickerGlyph({id,size=48}:{id:StickerId;size?:number}) {
  if(isColorStickerId(id)) return <ColorStickerArtwork id={id} size={Math.max(24,Math.floor(size/24)*24)}/>;
  return <StickerArtwork id={id} size={size} color={retro.color.ink}/>;
}
export type ActionSymbolName='back'|'check'|'photo'|'trash'|'minus'|'close'|'lock'|'play';
export function ActionSymbol({name,size=20,color=retro.color.ink}:{name:ActionSymbolName;size?:number;color?:string}) {
  const symbols={lock:'M5 1H11V2H12V6H14V15H2V6H4V2H5ZM6 3V6H10V3ZM7 9V12H9V9Z',play:'M3 1H6V3H8V5H10V7H12V9H10V11H8V13H6V15H3Z',back:'M10 1H13V4H10V7H7V10H10V13H13V16H10V13H7V10H4V7H7V4H10Z',check:'M1 8H4V11H7V8H10V5H13V2H16V6H13V9H10V12H7V15H4V12H1Z',photo:'M0 1H16V15H0Z M2 3V11L6 7L10 11L12 9L14 11V3Z M10 4H13V7H10Z',trash:'M5 0H11V2H15V4H1V2H5Z M3 5H13V16H3Z M5 7V14H6V7Z M10 7V14H11V7Z',minus:'M2 6H14V10H2Z',close:'M1 1H4V4H1Z M12 1H15V4H12Z M4 4H7V7H4Z M9 4H12V7H9Z M7 7H9V9H7Z M4 9H7V12H4Z M9 9H12V12H9Z M1 12H4V15H1Z M12 12H15V15H12Z'};
  return <Svg width={size} height={size} viewBox="0 0 16 16" {...(Platform.OS==='web'?{'aria-hidden':true}:{accessible:false})}><Path d={symbols[name]} fill={color} fillRule="evenodd"/></Svg>;
}
