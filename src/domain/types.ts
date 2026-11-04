export type BoardType = 'calendar' | 'tally';

/** solo 혼자, each 각자 판, one 한 판, show 보여주기 */
export type GoalMode = 'solo' | 'each' | 'one' | 'show';
export type MemberRole = 'owner' | 'member' | 'viewer';

export type Goal = {
  id: string;
  /** 함께 목표 방식. 혼자 목표는 solo */
  mode: GoalMode;
  /** 내가 이 목표에서 맡은 역할 */
  role: MemberRole;
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
  /** 마지막으로 붙인 시각. 떼도 바뀌지 않는다. 종료일 하한과 옛 목표의 첫 순서에 쓴다 (PRD 4.1) */
  lastPlacedAt: number | null;
  /** 적립판을 만들 때의 칸 수. 칸 늘리기 기본값. 달력판은 null */
  initialSlots: number | null;
  /**
   * 내 목표 목록 순서. 작을수록 위다. 사용자가 끌어 옮겨 정한다 (PRD 4.1, 2026-10-30).
   * null = 순서를 정하기 전 기록(서버에만 남은 옛 행). 읽을 때 최근순으로 놓는다.
   */
  sortOrder: number | null;
};

/** 목표가 기본 스티커 없이 만들어졌을 때의 값 */
/** 새 목표와 스티커의 기본 그림 (2026-11-04 새싹에서 네잎클로버로) */
export const DEFAULT_STICKER_ID = 'basic.clover';

/** 함께 목표의 멤버 한 줄. isMe는 이 기기 사용자 본인. */
export type GoalMember = {
  goalId: string;
  userId: string;
  isMe: boolean;
  role: MemberRole;
  displayName: string | null;
  stickerId: string | null;
  joinedAt: number | null;
};

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
  /** 어느 판에 붙었는가. 내 판은 'me', 한 판은 null, 친구 판은 그 사람 id */
  boardUserId: string | null;
  /** 붙인 사람. 'me' 또는 그 사람 id, 차단으로 가려지면 null */
  placedBy: string | null;
};

export type RecordNote = {
  id: string;
  stickerId: string;
  photoUri: string | null;
  memo: string | null;
  createdAt: number;
};
