import React, {type ReactNode} from 'react';
import {View, useWindowDimensions} from 'react-native';
import type {Meta, StoryObj} from '@storybook/react-vite';
import {AppHeader, EmptyState, GoalListHeader, RetroScreen} from '../src/design-system';

/** 목표가 하나도 없을 때의 목록 화면 (2026-09-30 확정, A안). 목록의 헤더·탭·`+`를 그대로 두고 안내 상자만 더한다. */
const meta = {
  title: 'Screens/Empty goal list',
  parameters: {layout: 'fullscreen', edgeToEdge: true, docs: {description: {component: '목표 없음 화면. 세 후보(안내 상자만 / 첫 판 패널 + 버튼 / 판 종류로 바로 시작) 중 안내 상자만으로 확정. 앱 동작에 연결되지 않습니다.'}}},
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const noop = () => {};

function Stage({children}: {children: ReactNode}) {
  const {width} = useWindowDimensions();
  return <View style={{width: Math.min(width, 390), height: 844}}>{children}</View>;
}
/** 앱 최상단과 탭 줄. 목표가 없어도 `+`는 같은 자리에 있어 튜토리얼 1단계와 맞는다. */
function ListFrame({children}: {children: ReactNode}) {
  return <Stage><RetroScreen style={{gap: 16}}>
    <AppHeader onSettings={noop}/>
    <GoalListHeader tab="active" counts={{active: 0, completed: 0}} onTab={noop} onAdd={noop}/>
    {children}
  </RetroScreen></Stage>;
}

/** 완성한 판 탭의 빈 목록과 같은 안내 상자 하나. 만드는 동작은 `+`뿐이다. */
export const OnlyNotice: Story = {name: '목록 · 목표 없음', render: () => <ListFrame>
  <EmptyState title="아직 목표가 없어요" description="오른쪽 위 ＋를 눌러 첫 목표를 만들어요."/>
</ListFrame>};
