import React, {type ReactNode} from 'react';
import {Pressable, View, useWindowDimensions} from 'react-native';
import type {Meta, StoryObj} from '@storybook/react-vite';
import {
  AppHeader, GoalListHeader, GoalSummaryCard, PixelIcon, PixelPanel, PixelText, RetroScreen, ScreenHeader,
  SettingRow, TextAction, retro, type GoalCardItem,
} from '../src/design-system';

/** 튜토리얼 다시 보기 진입 위치 시안 (PRD 4.6·4.9). **2026-09-30 A안 확정** — 앱 설정 → 도움말 → 사용법 다시 보기(`/tutorial`). B·C는 비교 기록으로 남긴다. */
const meta = {
  title: 'Screens/Tutorial replay · proposals',
  parameters: {layout: 'fullscreen', edgeToEdge: true, docs: {description: {component: '튜토리얼 다시 보기를 어디서 여는지 세 안. 2026-09-30 A(앱 설정 안의 행)로 확정했다. 어느 안이든 누르면 목록 화면으로 돌아가 첫 실행과 같은 5단계 튜토리얼을 1단계부터 보여준다(스포트라이트가 목록의 `+`와 카드를 가리키기 때문). A안은 앱에 연결했다. B·C는 앱 동작에 연결되지 않습니다.'}}},
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const noop = () => {};
const goals: GoalCardItem[] = [
  {id: 'a', name: '매일 산책하기', sticker: 'basic.shoe', kind: '달력판', percent: 40, status: ['이번 달 40% 채웠어요']},
  {id: 'b', name: '책 20권 읽기', sticker: 'basic.book', kind: '적립판', percent: 35, status: ['35% 채웠어요']},
];

function Stage({children}: {children: ReactNode}) {
  const {width} = useWindowDimensions();
  return <View style={{width: Math.min(width, 390), height: 844}}>{children}</View>;
}
function Cards() {
  return <View style={{gap: 12}}>{goals.map(g => <GoalSummaryCard key={g.id} name={g.name} sticker={g.sticker} kind={g.kind} percent={g.percent} status={g.status} onPress={noop}/>)}</View>;
}

/** A. 앱 설정 → 도움말 → 사용법 다시 보기. PRD 4.9가 앱 설정 항목으로 적은 위치. 눈에 덜 띄지만 목록이 깔끔하다. */
export const InSettings: Story = {name: 'A · 앱 설정 안의 행', render: () => <Stage><RetroScreen style={{gap: 16}}>
  <ScreenHeader title="앱 설정" onBack={noop}/>
  <PixelPanel title="이 기기의 기록"><PixelText>지금은 이 기기에만 저장하고 있어요.</PixelText></PixelPanel>
  <PixelPanel title="도움말"><SettingRow label="사용법 다시 보기" onPress={noop}/></PixelPanel>
  <PixelPanel title="정보"><SettingRow label="약관과 라이선스" onPress={noop}/></PixelPanel>
</RetroScreen></Stage>};

/** B. 목록 헤더 톱니바퀴 옆 `?`. 가장 빨리 닿지만 헤더에 버튼이 하나 늘어 320px에서 브랜드 줄이 빠듯해진다. */
function HeaderWithHelp() {
  return <View style={{height: 44, flexDirection: 'row', gap: 10, alignItems: 'center'}}>
    <PixelIcon name="flower" size={44}/><PixelText variant="brand">차곡차곡</PixelText>
    <View style={{marginLeft: 'auto', flexDirection: 'row', gap: 4, alignItems: 'center'}}>
      <Pressable accessibilityRole="button" accessibilityLabel="사용법 다시 보기" onPress={noop} style={{width: 40, height: 40, alignItems: 'center', justifyContent: 'center'}}>
        {/* 작은 PixelFrame은 모서리가 깎여 +로 보여 옆의 새 목표 +와 헷갈린다. 잉크 테두리 네모로 그린다. */}
        <View style={{width: 26, height: 26, borderWidth: retro.shape.border, borderColor: retro.color.ink, backgroundColor: retro.color.lcd, alignItems: 'center', justifyContent: 'center'}}>
          <PixelText style={{fontSize: 16, lineHeight: 20}}>?</PixelText>
        </View>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="앱 설정" onPress={noop} style={{width: 36, height: 40, alignItems: 'center', justifyContent: 'center'}}><PixelIcon name="gear" size={28}/></Pressable>
    </View>
  </View>;
}
export const InHeader: Story = {name: 'B · 목록 헤더의 ? 버튼', render: () => <Stage><RetroScreen style={{gap: 16}}>
  <HeaderWithHelp/>
  <GoalListHeader tab="active" counts={{active: 2, completed: 1}} onTab={noop} onAdd={noop}/>
  <Cards/>
</RetroScreen></Stage>};

/** C. 목록 맨 아래 텍스트 링크. 목록을 끝까지 내렸을 때만 보여 평소엔 방해가 없지만, 목표가 많으면 찾기 어렵다. */
export const AtListEnd: Story = {name: 'C · 목록 맨 아래 링크', render: () => <Stage><RetroScreen style={{gap: 16}}>
  <AppHeader onSettings={noop}/>
  <GoalListHeader tab="active" counts={{active: 2, completed: 1}} onTab={noop} onAdd={noop}/>
  <Cards/>
  <View style={{borderTopWidth: retro.shape.border, borderColor: retro.color.ink, opacity: 0.2}}/>
  <TextAction label="사용법 다시 보기" onPress={noop}/>
</RetroScreen></Stage>};
