import React from 'react';
import {View} from 'react-native';
import type {Meta, StoryObj} from '@storybook/react-vite';
import {SettingRow} from '../src/design-system';

const meta = {
  title: 'Components/Setting row',
  component: SettingRow,
  args: {label: '이용약관', navigates: true},
  decorators: [Story => <View style={{width: 350, maxWidth: '100%'}}><Story/></View>],
  parameters: {docs: {description: {component: '앱 설정·약관 목록의 공통 행. 이동 화살표, 현재 값, 긴 문구, 비활성 상태를 확인합니다.'}}},
} satisfies Meta<typeof SettingRow>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Navigation: Story = {name: '이동 행'};
export const CurrentValue: Story = {name: '현재 값', args: {label: '마지막 백업', value: '오늘 9:20', navigates: false}};
export const LongLabel: Story = {name: '긴 문구', args: {label: '오픈소스 라이선스와 저작권 고지'}};
export const Disabled: Story = {name: '비활성', args: {label: '계정 연결', disabled: true}};
