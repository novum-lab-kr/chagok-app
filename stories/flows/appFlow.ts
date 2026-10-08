import data from './app-flow.json';

// 애드온 자동 배치(dagre)는 간격이 고정이라 화면이 많으면 너무 멀어진다.
// 영역마다 한 줄(레인)에 두고 칸 번호로 자리를 정한다. 화면을 추가하면 여기에 [줄, 칸]만 넣는다.
const SCREEN = { w: 379, h: 920 }; // 화면 노드: iphonex 375 + 테두리, 높이는 헤더 포함
const PLACEHOLDER = { w: 220, h: 140 }; // 화면 없는 노드
const CELL_W = SCREEN.w + 100;
const CELL_H = SCREEN.h + 120;

const grid: Record<string, [row: number, col: number]> = {
  // 0 첫 사용·계정 연결
  splash: [0, 0], start: [0, 1], consent: [0, 2], restore: [0, 3], conflict: [0, 4], tutorial: [0, 5],
  // 1 일상 기록
  widget: [1, 0], watch: [1, 1], list: [1, 2], new: [1, 3], detail: [1, 4], record: [1, 5], photos: [1, 6],
  // 2 목표 관리·판 완료
  'goal-settings': [2, 4], 'goal-delete': [2, 5], complete: [2, 6], extend: [2, 7], 'completed-board': [2, 8],
  // 3 앱 설정·정보
  'app-settings': [3, 2], replay: [3, 3], policies: [3, 4], license: [3, 5], 'policy-web': [3, 6], mail: [3, 7],
  // 4 계정 삭제
  'account-delete': [4, 3], deleted: [4, 4],
  // 5 스티커 묶음·구매
  'sticker-chooser': [5, 3], pack: [5, 4], 'store-pay': [5, 5], 'rewarded-ad': [5, 6],
};

export const appFlow = {
  ...data,
  nodes: data.nodes.map((node) => {
    const cell = grid[node.id];
    if (!cell) throw new Error(`appFlow: ${node.id}의 자리가 grid에 없다`);
    const [row, col] = cell;
    const hasStory = Boolean('stories' in node.data && node.data.stories?.length);
    // 화면 없는 작은 노드는 칸 가운데에 둔다.
    const dx = hasStory ? 0 : (SCREEN.w - PLACEHOLDER.w) / 2;
    const dy = hasStory ? 0 : (SCREEN.h - PLACEHOLDER.h) / 2;
    return {
      ...node,
      position: { x: col * CELL_W + dx, y: row * CELL_H + dy },
      sourcePosition: 'right' as const, // React Flow Position.Right
      targetPosition: 'left' as const,
    };
  }),
};
