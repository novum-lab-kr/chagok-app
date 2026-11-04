import React from 'react';
import {afterEach,describe,expect,it,vi} from 'vitest';
import {cleanup,render,screen} from '@testing-library/react';
import {FirstRunTutorial,TutorialBoardExample,TutorialCompletedExample} from './first-run-tutorial';
afterEach(cleanup);

describe('튜토리얼 예시 화면',()=>{
  // 예시는 저장값을 거치지 않고 스티커 ID를 직접 넘긴다. 흑백 ID를 넘기면 앱과 달리 예전 흑백 스티커로 그렸다 (2026-10-10).
  it('적립판 예시는 기본 스티커(네잎클로버)로 그린다',()=>{
    render(<TutorialBoardExample/>);
    expect(screen.getByRole('button',{name:'1번 칸, 네잎클로버 스티커'})).toBeTruthy();
  });
  it('완성한 판 예시는 컬러 별 스티커로 그린다',()=>{
    const {container}=render(<TutorialCompletedExample/>);
    // 흑백 별과 이름이 같아 색으로 가린다. 컬러 별의 노란색
    expect(container.innerHTML.toLowerCase()).toContain('#ffd25e');
  });
});

describe('튜토리얼 진행 알림',()=>{
  // 단계 버튼은 레이아웃 측정 뒤에 그려져 jsdom에서 누를 수 없다. 같은 단계 효과를 다시 돌려 시작이 한 번뿐인지 본다.
  it('단계 알림이 다시 돌아도 시작은 한 번만 알린다',()=>{
    const first=vi.fn(),second=vi.fn();
    const {rerender}=render(<FirstRunTutorial onFinish={()=>{}} onProgress={first}/>);
    rerender(<FirstRunTutorial onFinish={()=>{}} onProgress={second}/>);
    expect(first.mock.calls.map(([progress])=>progress.kind)).toEqual(['start','step']);
    expect(second.mock.calls.map(([progress])=>progress.kind)).toEqual(['step']);
  });
});
