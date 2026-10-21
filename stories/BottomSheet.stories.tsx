import React from 'react';
import {View, useWindowDimensions} from 'react-native';
import type {Meta, StoryObj} from '@storybook/react-vite';
import {PixelBottomSheet, PixelButton, PixelText, retro} from '../src/design-system';

const meta = {
  title: 'Components/BottomSheet',
  component: PixelBottomSheet,
  args: {visible: true, title: '처음 오셨네요', onRequestClose: () => {}, children: null},
  parameters: {
    layout: 'fullscreen', edgeToEdge: true,
    docs: {description: {component: '화면 아래에 붙는 시트. 다이얼로그 틀과 여백(dialogPadding)을 그대로 쓰고 자리만 아래다. 끌어 닫기는 없고, 배경을 누르거나 Android 뒤로가기면 onRequestClose를 부른다.'}},
  },
} satisfies Meta<typeof PixelBottomSheet>;
export default meta;
type Story = StoryObj<typeof meta>;

function Behind() {
  const {width} = useWindowDimensions();
  return <View style={{width: Math.min(width, 390), height: 844, marginHorizontal: 'auto', backgroundColor: retro.color.screen, padding: 20}}>
    <PixelText variant="title">뒤 화면</PixelText>
  </View>;
}

export const Basic: Story = {
  name: '기본',
  render: args => <>
    <Behind/>
    <PixelBottomSheet {...args}>
      <PixelText>시트 안 내용이 들어가는 자리예요.</PixelText>
      <PixelButton label="확인" onPress={() => {}}/>
    </PixelBottomSheet>
  </>,
};
