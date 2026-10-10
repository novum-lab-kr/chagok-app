import React from 'react';
import {afterEach,describe,expect,it} from 'vitest';
import {cleanup,render,screen} from '@testing-library/react';
import {TutorialBoardExample,TutorialCompletedExample} from './first-run-tutorial';
afterEach(cleanup);

describe('튜토리얼 예시 화면',()=>{
  // 예시는 저장값을 거치지 않고 스티커 ID를 직접 넘긴다. 흑백 ID를 넘기면 앱과 달리 예전 흑백 스티커로 그렸다 (2026-10-10).
  it('적립판 예시는 컬러 새싹 스티커로 그린다',()=>{
    render(<TutorialBoardExample/>);
    expect(screen.getByRole('button',{name:'1번 칸, 새싹 스티커'})).toBeTruthy();
  });
  it('완성한 판 예시는 컬러 별 스티커로 그린다',()=>{
    const {container}=render(<TutorialCompletedExample/>);
    // 흑백 별과 이름이 같아 색으로 가린다. 컬러 별의 노란색
    expect(container.innerHTML.toLowerCase()).toContain('#ffd25e');
  });
});
