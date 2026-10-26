import {colorStickerData} from './stickers.generated';

export type ColorStickerPackId='basic'|'sports_normal'|'snack_normal'|'objects_normal'|'animals_normal'|'emotions_normal'|'weather_normal';
export interface ColorStickerLayer {readonly color:string; readonly d:string}
export interface ColorStickerDefinition {
  readonly id:string;
  readonly label:string;
  readonly pack:ColorStickerPackId;
  /** 24×24 칸 위의 색별 층. 칸끼리 겹치지 않는다. */
  readonly layers:readonly ColorStickerLayer[];
}

/** 표시 순서대로. 기본, 동물, 감정이 무료다(2026-10-26). */
export const colorStickerPacks=[
  {id:'basic',label:'기본',free:true},
  {id:'sports_normal',label:'운동',free:false},
  {id:'snack_normal',label:'간식',free:false},
  {id:'objects_normal',label:'사물',free:false},
  {id:'animals_normal',label:'동물',free:true},
  {id:'emotions_normal',label:'감정',free:true},
  {id:'weather_normal',label:'날씨와 계절',free:false},
] as const satisfies readonly {id:ColorStickerPackId;label:string;free:boolean}[];

/** Stable IDs: append new definitions; never reuse an ID for a different sticker. */
export const colorStickers:readonly ColorStickerDefinition[]=colorStickerData;
export type ColorStickerId=typeof colorStickerData[number]['id'];

export function getColorSticker(id:ColorStickerId):ColorStickerDefinition {
  const sticker=colorStickers.find(s=>s.id===id);
  if (!sticker) throw new Error(`Unknown color sticker: ${id}`);
  return sticker;
}
export const colorStickersInPack=(pack:ColorStickerPackId)=>colorStickers.filter(s=>s.pack===pack);
