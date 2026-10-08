import data from './input-flow.json';

// 상태 하나가 노드 하나다. 노드 id는 `<입력칸>--<상태>`이고, 입력칸마다 한 줄에 상태를 옆으로 늘어놓는다.
// 줄 순서는 input-flow.json에 처음 나온 순서, 칸 순서는 그 입력칸 안의 순서다.
// 간격·화면 크기는 appFlow.ts와 같다(Storybook 기본 기기 iPhone X 375px).
const SCREEN = { w: 379, h: 920 };
const CELL_W = SCREEN.w + 100;
const CELL_H = SCREEN.h + 120;

const rows: string[] = [];
const cols: Record<string, number> = {};

export const inputFlow = {
  ...data,
  nodes: data.nodes.map((node) => {
    const field = node.id.split('--')[0];
    if (!rows.includes(field)) rows.push(field);
    const col = cols[field] ?? 0;
    cols[field] = col + 1;
    return { ...node, position: { x: col * CELL_W, y: rows.indexOf(field) * CELL_H }, sourcePosition: 'right' as const, targetPosition: 'left' as const };
  }),
};
