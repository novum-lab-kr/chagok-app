import React, {type ReactNode} from 'react';
import {View, useWindowDimensions} from 'react-native';
import type {Meta, StoryObj} from '@storybook/react-vite';
import {LoadingScreen} from '../src/design-system';

/** 화면을 보여 주지 못할 때 (2026-10-10 시안 B안 확정, PRD 7절). 무엇을 못 보여 줬는지에 따라 문구만 다르다. */
const meta = {
  title: 'Screens/Screen failed',
  parameters: {layout: 'fullscreen', edgeToEdge: true, docs: {description: {component: '`LoadingScreen`(읽는 중 → 실패)과 `ScreenFailed`(안내 본문). 앱의 대기 화면 8곳과 화면 오류(ErrorBoundary)가 같이 쓴다. 홈에서는 [홈으로]가 없다.'}}},
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const noop = () => {};
function Stage({children}: {children: ReactNode}) {
  const {width} = useWindowDimensions();
  return <View style={{width: Math.min(width, 440), height: 844}}>{children}</View>;
}

export const Records: Story = {name: '기록 (판·목표 설정·칸 늘리기·기록)', render: () => <Stage><LoadingScreen failed kind="records" onRetry={noop} onHome={noop}/></Stage>};
export const Goals: Story = {name: '목표 (홈, [홈으로] 없음)', render: () => <Stage><LoadingScreen failed kind="goals" onRetry={noop}/></Stage>};
export const Stickers: Story = {name: '스티커 (기본 스티커·묶음)', render: () => <Stage><LoadingScreen failed kind="stickers" onRetry={noop} onHome={noop}/></Stage>};
export const Screen: Story = {name: '화면 오류 (그 밖)', render: () => <Stage><LoadingScreen failed kind="screen" onRetry={noop} onHome={noop}/></Stage>};
export const Loading: Story = {name: '읽는 중', render: () => <Stage><LoadingScreen failed={false} onRetry={noop}/></Stage>};
