import React from 'react';
import {View} from 'react-native';
import type {Meta, StoryObj} from '@storybook/react-vite';
import {PixelLoadingIndicator, ShortNotice} from '../src/design-system';

const meta = {
  title: 'Components/Feedback',
  decorators: [Story => <View style={{width: 350, maxWidth: '100%'}}><Story/></View>],
  parameters: {docs: {description: {component: '현재 시안의 짧은 알림과 정적 로딩 표시. 알림은 승인된 프레임·색을 공유하고 문구로 상태를 구분합니다.'}}},
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const NoticeSaved: Story = {name: '짧은 알림 · 저장 완료', render: () => <ShortNotice title="기록을 저장했어요"/>};
export const NoticeFailed: Story = {name: '짧은 알림 · 저장 실패', render: () => <ShortNotice title="저장하지 못했어요" detail="입력한 내용은 그대로 있어요."/>};
export const Loading: Story = {name: '로딩 표시 · 복원 중', render: () => <PixelLoadingIndicator label="기록 복원 중"/>};
