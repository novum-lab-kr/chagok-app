import React from 'react';
import {View, useWindowDimensions} from 'react-native';
import type {Meta, StoryObj} from '@storybook/react-vite';
import {PixelBusyDialog, PixelDialog, PixelDialogModal, PixelText, accountDialogs, boardDialogs, colorPack, retro, stickerShopDialogs} from '../src/design-system';
import {deleteDescription} from '../src/app-data/pocketAdapter';

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
  args: {variant: 'basic', ...boardDialogs.deleteGoal(deleteDescription({stickers: 6, records: 2}))},
  parameters: {layout: 'fullscreen', edgeToEdge: true},
  render: args => <CenteredPreview {...args}/>,
};
export const BasicModal: Story = {
  name: '일반 화면 · Modal 호스트',
  args: {variant: 'basic', ...boardDialogs.unsaved},
  parameters: {layout: 'fullscreen', edgeToEdge: true},
  render: ({variant: _variant, step: _step, ...args}) => <PixelDialogModal visible onRequestClose={() => {}} {...args}/>,
};
export const BasicSingle: Story = {
  name: '일반 화면 · 버튼 하나',
  args: {variant: 'basic', single: true, ...boardDialogs.saveFailed('저장하지 못했어요')},
  parameters: {layout: 'fullscreen', edgeToEdge: true},
  render: args => <CenteredPreview {...args}/>,
};

// ── 문구 모음 ─────────────────────────────────────────────────────
type Spec = React.ComponentProps<typeof PixelDialog>;
/**
 * [이름, 문구]. 이름은 어느 화면에서 언제 뜨는지. 예시 값(개수·날짜)만 여기서 정하고 문구는 앱과 같은 객체에서 읽는다.
 * 보조 버튼 문구가 없으면 버튼 하나로 그린다 — 앱 useDialog와 같은 규칙.
 */
const groups: [string, [string, Spec][]][] = [
  ['목표·판 (boardDialogs)', [
    ['판 · 마지막 칸 붙이기 전', boardDialogs.confirmLast('tally')],
    ['판 · 기간 마지막 빈 날 붙이기 전', boardDialogs.confirmLast('calendar')],
    ['판 · 완성 뒤 (적립판)', boardDialogs.completed('tally')],
    ['판 · 완성 뒤 (종료일 지남)', boardDialogs.completed('period')],
    ['판 · 완성 뒤 (수동 완성)', boardDialogs.completed('open')],
    ['판 · 기록 있는 칸 떼기', boardDialogs.removeSticker],
    ['목표 설정 · 수동 완성', boardDialogs.confirmManual],
    ['목표 설정 · 삭제', boardDialogs.deleteGoal(deleteDescription({stickers: 6, records: 2}))],
    ['목표 설정 · 삭제 (붙인 것 없음)', boardDialogs.deleteGoal(deleteDescription({stickers: 0, records: 0}))],
    ['고치는 화면 · 저장 않고 나가기', boardDialogs.unsaved],
    ['저장 실패', boardDialogs.saveFailed('저장하지 못했어요')],
  ]],
  ['기록 (boardDialogs)', [
    ['기록 · 스티커 떼기', boardDialogs.removeStickerInRecord],
    ['기록 · 사진 권한 없음', boardDialogs.photoDenied],
    ['기록 · 카메라 권한 없음', boardDialogs.cameraDenied],
    ['기록 · 카메라를 열 수 없음', boardDialogs.cameraUnavailable],
  ]],
  ['계정 (accountDialogs)', [
    ['앱 열 때 · 로그인 필요', accountDialogs.session],
    ['앱 열 때 · 약관 변경', accountDialogs.termsChanged('10월 15일')],
    ['새 계정 동의, 그만하기', accountDialogs.quitSignup],
    ['새 계정 동의, 계정을 못 지움', accountDialogs.quitFailed],
    ['복원 · 실패', accountDialogs.restoreFailed],
    ['로그아웃 · 확인', accountDialogs.logout],
    ['로그아웃 · 백업 중', {...accountDialogs.logout, loading: true}],
    ['로그아웃 · 백업 실패', accountDialogs.logoutFailed],
    ['로그아웃 · 백업할 수 없는 기록', accountDialogs.logoutHeld(2)],
    ['계정 삭제 · 최종 확인', accountDialogs.deleteAccount],
    ['계정 삭제 · 삭제 중', {...accountDialogs.deleteAccount, loading: true}],
    ['계정 삭제 · 실패', accountDialogs.deleteFailed],
  ]],
  ['스티커 묶음·구매 (stickerShopDialogs)', [
    ['묶음 · 사기 전 확인', stickerShopDialogs.confirmBuy(colorPack('objects_normal', 'locked').label, colorPack('objects_normal', 'locked').stickers.length, '2,200원')],
    ['묶음 · 사기 전 확인 (가격을 못 받아 왔을 때)', stickerShopDialogs.confirmBuy(colorPack('objects_normal', 'locked').label, colorPack('objects_normal', 'locked').stickers.length)],
    ['묶음 · 산 직후', stickerShopDialogs.bought('동물')],
    ['묶음 · 결제 실패', stickerShopDialogs.buyFailed],
    ['묶음 · 보호자 승인 기다림', stickerShopDialogs.purchasePending],
    ['묶음 · 광고를 못 불러옴', stickerShopDialogs.adUnavailable],
    ['묶음 · 광고를 다 본 뒤', stickerShopDialogs.adTrialStarted('내일 밤 11:00')],
    ['판 · 체험이 끝난 뒤 붙이려 할 때', stickerShopDialogs.trialEnded('3일')],
    ['설정 · 광고 제거 사기 전', stickerShopDialogs.confirmAdFree],
    ['설정 · 광고 제거 실패', stickerShopDialogs.adFreeFailed],
    ['설정 · 구매 복원 찾음', stickerShopDialogs.restoreDone(['동물 묶음', '간식 묶음', '광고 제거'])],
    ['설정 · 구매 복원 없음', stickerShopDialogs.restoreNone],
    ['설정 · 구매 복원 실패', stickerShopDialogs.restoreFailed],
  ]],
];
function Catalog() {
  const caption = {color: retro.color.buttonText};
  return <View style={{gap: 40, padding: 16, backgroundColor: retro.color.screen}}>
    {groups.map(([group, items]) => <View key={group} style={{gap: 16}}>
      <PixelText variant="title">{group}</PixelText>
      <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start'}}>
        {items.map(([name, spec]) => <View key={name} style={{width: 350, gap: 8}}>
          <PixelText variant="caption" style={caption}>{name}</PixelText>
          <PixelDialog variant="basic" {...spec} single={spec.single ?? spec.secondaryLabel === undefined}/>
        </View>)}
        {group.startsWith('계정') && <View style={{width: 350, gap: 8}}>
          <PixelText variant="caption" style={caption}>복원 · 기록 가져오는 중 (버튼 없음)</PixelText>
          <PixelBusyDialog {...accountDialogs.restoring}/>
        </View>}
      </View>
    </View>)}
  </View>;
}
/** 앱의 모든 확인 창. 문구를 바꾸면 이 표가 같이 바뀐다 — 화면마다 다이얼로그 스토리를 따로 두지 않는다. */
export const Copy: Story = {name: '문구 모음', parameters: {layout: 'fullscreen'}, render: () => <Catalog/>};
