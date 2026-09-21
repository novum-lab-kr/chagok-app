export type BoardType = 'calendar' | 'tally';

/** 판 하단 팔레트에 노출되는 스티커 5종. 선택은 유지된다. */
export const STICKER_TYPES = ['stamp', 'star', 'heart', 'flower', 'dot'] as const;
export type StickerType = (typeof STICKER_TYPES)[number];
export const STICKER_TYPE_DEFAULT: StickerType = 'stamp';

export type Goal = {
  id: string;
  name: string;
  boardType: BoardType;
  /** tally일 때만 값, calendar는 null */
  totalSlots: number | null;
  createdAt: number;
};

export type Sticker = {
  id: string;
  goalId: string;
  placedAt: number;
  slotIndex: number;
  stickerType: string;
};

export type RecordNote = {
  id: string;
  stickerId: string;
  photoUri: string | null;
  memo: string | null;
  createdAt: number;
};

export type Slot = {
  index: number;
  label: string;
  sticker: Sticker | null;
};
