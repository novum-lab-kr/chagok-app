import {colorStickerData} from './stickers.generated';

export type ColorStickerPackId='basic'|'sports_normal'|'snack_normal'|'objects_normal'|'animals_normal'|'emotions_normal'|'weather_normal'|'christmas_normal'|'study_normal'|'food_normal';
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
  {id:'christmas_normal',label:'크리스마스',free:false},
  {id:'study_normal',label:'공부와 일',free:false},
  {id:'food_normal',label:'카페와 음식',free:false},
] as const satisfies readonly {id:ColorStickerPackId;label:string;free:boolean}[];

/** Stable IDs: append new definitions; never reuse an ID for a different sticker. */
export const colorStickers:readonly ColorStickerDefinition[]=colorStickerData;
export type ColorStickerId=typeof colorStickerData[number]['id'];

export function getColorSticker(id:ColorStickerId):ColorStickerDefinition {
  const sticker=colorStickers.find(s=>s.id===id);
  if (!sticker) throw new Error(`Unknown color sticker: ${id}`);
  return sticker;
}
/**
 * 묶음 목록에서만 뺀 스티커. 이미 붙인 판과 목표는 그대로 그려야 해서 그림과 ID는 남긴다(ID는 다른 그림에 다시 쓰지 않는다).
 * 2026-11-04 기본 묶음 10개로 맞추며 새싹은 네잎클로버로, 운동화는 물방울로 바꿨다.
 */
export const retiredColorStickers:ReadonlySet<string>=new Set(['basic.sprout','basic.shoe']);
export const colorStickersInPack=(pack:ColorStickerPackId)=>colorStickers.filter(s=>s.pack===pack&&!retiredColorStickers.has(s.id));
