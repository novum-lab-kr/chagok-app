export type BoardType = 'calendar' | 'tally';

export type Goal = {
  id: string;
  name: string;
  boardType: BoardType;
  /** tally일 때만 값, calendar는 null */
  totalSlots: number | null;
  /**
   * 빈칸을 눌렀을 때 붙는 스티커 (PRD 4.4/4.5).
   * 컬러 스티커 id(`묶음.이름`, src/stickers/color/catalog.ts)를 저장한다. 목표마다 독립이다.
   * 예전 흑백 id가 남아 있어도 읽을 때 normalizeStickerId가 컬러로 옮긴다 (2026-10-08).
   */
  defaultStickerId: string;
  createdAt: number;
  /** 달력판 종료일 'YYYY-MM-DD'(로컬). null = 종료일 없음. 적립판은 항상 null (PRD 4.3) */
  endDate: string | null;
  /** 완성한 시각. null = 진행 중 (PRD 4.7) */
  completedAt: number | null;
  /** 완성 뒤 닫기/계속하기를 골랐는가. false인 완성한 판은 열 때 완성 흐름을 보여준다 */
  completionSeen: boolean;
  /** 마지막으로 붙인 시각. 떼도 바뀌지 않는다. 목록 정렬과 종료일 하한에 쓴다 (PRD 4.1) */
  lastPlacedAt: number | null;
  /** 적립판을 만들 때의 칸 수. 칸 늘리기 기본값. 달력판은 null */
  initialSlots: number | null;
};

/** 목표가 기본 스티커 없이 만들어졌을 때의 값 */
export const DEFAULT_STICKER_ID = 'basic.sprout';

export type Sticker = {
  id: string;
  goalId: string;
  placedAt: number;
  slotIndex: number;
  stickerType: string;
  /** 붙인 날짜 'YYYY-MM-DD'. 붙일 때 그 기기 시간대로 정해 저장한다 — 다른 시간대에서 열어도 칸이 그대로다 (PRD 4.5) */
  dateKey: string;
  /** 붙일 때 기기 시간대. UTC보다 몇 분 빠른가(한국 540). 붙인 곳의 시각을 보여 줄 때 쓴다 */
  tzOffsetMin: number;
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
