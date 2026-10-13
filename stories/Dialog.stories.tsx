import React from 'react';
import {View, useWindowDimensions} from 'react-native';
import type {Meta, StoryObj} from '@storybook/react-vite';
import {PixelDialog, PixelDialogModal, retro} from '../src/design-system';

const meta = {
  title: 'Components/Dialog',
  component: PixelDialog,
  args: {title: '목표 만들기', description: '＋를 눌러 목표를 만들어요', primaryLabel: '다음', secondaryLabel: '건너뛰기'},
  parameters: {docs: {description: {component: '같은 다이얼로그 표면의 tutorial/basic 변형입니다. 실제 Modal 호스트가 위치·포커스·닫기·배경 차단을 담당합니다.'}}},
} satisfies Meta<typeof PixelDialog>;
export default meta;
type Story = StoryObj<typeof meta>;

export const FirstStep: Story = {args: {step: '1 / 5'}};
export const StickerStep: Story = {args: {step: '2 / 5', title: '스티커 고르기', description: '목표마다 스티커를 정해요'}};
export const LastStep: Story = {args: {step: '5 / 5', title: '완성한 판', description: '판을 다 채우면 완성! 완성한 뒤에도 빠진 칸과 기록을 고칠 수 있어요', primaryLabel: '시작하기'}};

function CenteredPreview(args: React.ComponentProps<typeof PixelDialog>) {
  const {width} = useWindowDimensions();
  return <View style={{width: Math.min(width, 390), height: 844, marginHorizontal: 'auto', backgroundColor: retro.color.screen, justifyContent: 'center', padding: 20}}>
    <PixelDialog {...args}/>
  </View>;
}
export const Basic: Story = {
  name: '일반 화면 · 중앙',
  args: {variant: 'basic', title: '목표를 삭제할까요?', description: '스티커 6개와 기록 2개도 함께 사라져요.', primaryLabel: '삭제하기', secondaryLabel: '취소'},
  parameters: {layout: 'fullscreen', edgeToEdge: true},
  render: args => <CenteredPreview {...args}/>,
};
export const BasicModal: Story = {
  name: '일반 화면 · Modal 호스트',
  args: {variant: 'basic', title: '저장하지 않고 나갈까요?', description: '지금 쓴 내용이 사라져요.', primaryLabel: '계속 쓰기', secondaryLabel: '나가기'},
  parameters: {layout: 'fullscreen', edgeToEdge: true},
  render: ({variant: _variant, step: _step, ...args}) => <PixelDialogModal visible onRequestClose={() => {}} {...args}/>,
};
export const BasicSingle: Story = {
  name: '일반 화면 · 버튼 하나',
  args: {variant: 'basic', single: true, title: '저장하지 못했어요', description: '잠시 후 다시 시도해주세요. 입력한 내용은 그대로 있어요.', primaryLabel: '확인'},
  parameters: {layout: 'fullscreen', edgeToEdge: true},
  render: args => <CenteredPreview {...args}/>,
};
