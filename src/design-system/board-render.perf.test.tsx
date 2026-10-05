import React,{Profiler} from 'react';
import {describe,it} from 'vitest';
import {cleanup,render} from '@testing-library/react';
import {BoardDetailScreen} from './board-screens';
import type {TallyBoardView} from './board-screens';

/*
 * 적립판 렌더 측정 (2026-10-04). 평소 테스트에서는 건너뛴다. 실행:
 *   PERF=1 npx vitest run --config vitest.components.config.ts src/design-system/board-render.perf.test.tsx
 * 앱(app/goal/[id]/index.tsx)처럼 그릴 때마다 새 판 객체·새 onPress를 넘기고, 한 칸씩 붙여 가며 잰다.
 * jsdom 수치라 실기기(Hermes·네이티브 그리기)와 절대값은 다르다. 같은 스크립트로 전후를 비교하는 용도다.
 */
function Host({total,placed}:{total:number;placed:number}) {
  const filled:Record<number,'shoe'>={};
  for (let n=1;n<=placed;n++) filled[n]='shoe';
  const board:TallyBoardView={kind:'tally',total,filled,recorded:new Set(),justPlaced:placed,onPress:()=>{},onOpenRecord:()=>{}};
  return <BoardDetailScreen name="물 마시기" sticker="shoe" completed={false} progress={{value:placed,total,percentLabel:`${Math.floor(placed/total*100)}%`}}
    board={board} onBack={()=>{}} onSettings={()=>{}}/>;
}
const median=(xs:number[])=>[...xs].sort((a,b)=>a-b)[Math.floor(xs.length/2)];

describe.skipIf(!process.env.PERF)('적립판 렌더 측정',()=>{
  for (const total of [30,100,300,1000]) it(`${total}칸`,()=>{
    let reactMs=0;
    const onRender=(_id:string,_phase:string,actual:number)=>{reactMs+=actual;};
    const app=(placed:number)=><Profiler id="board" onRender={onRender}><Host total={total} placed={placed}/></Profiler>;
    // 판을 처음 열 때
    const mounts:number[]=[];
    for (let i=0;i<5;i++) {const t=performance.now();const r=render(app(10));mounts.push(performance.now()-t);r.unmount();}
    // 붙일 때마다 (11번째 칸부터 20번)
    const r=render(app(10));
    const wall:number[]=[],react:number[]=[];
    for (let k=11;k<=30;k++) {reactMs=0;const t=performance.now();r.rerender(app(k));wall.push(performance.now()-t);react.push(reactMs);}
    r.unmount();cleanup();
    process.stdout.write(`PERF ${total}칸 | 처음 열기 ${median(mounts).toFixed(1)}ms | 붙일 때 ${median(wall).toFixed(1)}ms (React 계산 ${median(react).toFixed(1)}ms)\n`);
  });
});
