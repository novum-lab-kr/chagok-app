import {sproutAsset} from './assets/sprout';
import {catAsset} from './assets/cat';
import {starAsset} from './assets/star';
import {flowerAsset} from './assets/flower';
import {bookAsset} from './assets/book';
import {shoeAsset} from './assets/shoe';

export interface StickerAsset {
  readonly viewBox:string;
  readonly path:string;
  readonly revision:number;
  readonly source:{readonly file:string;readonly crop:readonly number[];readonly sha256?:string};
}
export interface PocketStickerDefinition {
  readonly id:string;
  readonly label:string;
  readonly group:'친구'|'모양'|'사물';
  readonly asset:StickerAsset;
}

/** Stable IDs: append new definitions; never reuse an ID for a different sticker. */
export const pocketStickers = [
  {id:'sprout',label:'새싹이',group:'친구',asset:sproutAsset},
  {id:'cat',label:'고양이',group:'친구',asset:catAsset},
  {id:'star',label:'별',group:'모양',asset:starAsset},
  {id:'flower',label:'꽃',group:'모양',asset:flowerAsset},
  {id:'book',label:'책',group:'사물',asset:bookAsset},
  {id:'shoe',label:'운동화',group:'사물',asset:shoeAsset},
] as const satisfies readonly PocketStickerDefinition[];
export type PocketStickerId=typeof pocketStickers[number]['id'];
export function getPocketSticker(id:PocketStickerId) {
  const definition=pocketStickers.find(item=>item.id===id);
  if(!definition)throw new Error(`Unknown pocket sticker: ${id}`);
  return definition;
}
export const stickerLabel=(id:PocketStickerId)=>getPocketSticker(id).label;
