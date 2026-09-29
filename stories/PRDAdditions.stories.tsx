import React, {useState, type ReactNode} from 'react';
import {Pressable, View, useWindowDimensions} from 'react-native';
import type {Meta, StoryObj} from '@storybook/react-vite';
import {
  PixelButton, PixelDialog, PixelFrame, PixelIcon, PixelInput,
  PixelPanel, PixelText, StickerGlyph, RetroScreen,
  ScreenHeader, SlotCountPicker, TextAction, HomeScreen, GoalEditorScreen,
  RecordScreen, TutorialScreen, SettingRow, ShortNotice, PixelLoadingIndicator, exampleGoals, retro,
} from '../src/design-system';
import {ActionSymbol} from '../src/design-system/sticker-glyphs';

/** Review-only compositions. These stories do not change app routes or approved tokens. */
const meta = {
  title: 'Screens/PRD additions · proposals',
  parameters: {layout: 'fullscreen', edgeToEdge: true, docs: {description: {component: 'PRD 4.2–4.9 및 7–9절에 필요한 화면 설계 시안. 선택 전 비교용이며 앱 동작에 연결되지 않습니다.'}}},
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

function Screen({title, children, action}: {title?: string; children: ReactNode; action?: ReactNode}) {
  const {width} = useWindowDimensions();
  return <View style={{width: Math.min(width, 390), height: 844, flex: 1}}>
    <RetroScreen style={{gap: 16}}>
      {title && <ScreenHeader title={title} onBack={() => {}} action={action}/>}
      {children}
    </RetroScreen>
  </View>;
}
function Stage({children}: {children: ReactNode}) {
  const {width} = useWindowDimensions();
  return <View style={{width: Math.min(width, 390), height: 844}}>{children}</View>;
}
function Rule() {return <View style={{height: retro.shape.panelTitleBorder, backgroundColor: retro.color.ink}}/>;}
function Copy({children, small = false, center = false}: {children: ReactNode; small?: boolean; center?: boolean}) {
  return <PixelText style={[small ? {fontSize: 15, lineHeight: 22} : undefined, center ? {textAlign: 'center'} : undefined]}>{children}</PixelText>;
}
function Surface({children}: {children: ReactNode}) {
  return <PixelFrame variant="input" fill={retro.color.secondary} contentStyle={{padding: 16, gap: 12}}>{children}</PixelFrame>;
}
function Status({title, detail}: {title: string; detail: string}) {
  return <Surface><PixelText variant="title" style={{fontSize: 24, lineHeight: 32}}>{title}</PixelText><Copy small>{detail}</Copy></Surface>;
}
function Actions({primary, secondary}: {primary: string; secondary?: string}) {
  return <View style={{gap: 10}}><PixelButton label={primary} onPress={() => {}}/>{secondary && <PixelButton label={secondary} variant="secondary" onPress={() => {}}/>}</View>;
}
function Stamp() {
  return <View style={{transform: [{rotate: '-8deg'}]}}><PixelFrame variant="selection" fill={retro.color.primary} contentStyle={{width: 164, height: 126, alignItems: 'center', justifyContent: 'center', gap: 4}}>
    <PixelIcon name="flower" size={25}/>
    <PixelText variant="title" style={{fontSize: 36, lineHeight: 44}}>완성!</PixelText>
    <PixelText style={{fontSize: 14, lineHeight: 20}}>차곡차곡</PixelText>
  </PixelFrame></View>;
}
const sampleRecords: Record<number, {memo?: string; photoUri?: string}> = {2: {memo: '오늘 한 챕터를 읽었다.'}, 5: {photoUri: 'local-photo'}, 6: {memo: '   ', photoUri: ''}};
const recordedSlots = new Set(Object.entries(sampleRecords).filter(([, record]) => Boolean(record.memo?.trim() || record.photoUri)).map(([slot]) => Number(slot)));
function ExistingHome({completed = false, calendar = false, showRecordedMarks = false, longName = false, showCompletionAction = false}: {completed?: boolean; calendar?: boolean; showRecordedMarks?: boolean; longName?: boolean; showCompletionAction?: boolean}) {
  const {width} = useWindowDimensions();
  const reading = {...exampleGoals[0], name: longName ? '매일 저녁 동네 한 바퀴 걷기' : exampleGoals[0].name, filled: completed && !calendar ? Array.from({length: exampleGoals[0].total}, (_, i) => i + 1) : exampleGoals[0].filled};
  const walking = {...exampleGoals[1], calendarRecords: completed && calendar ? Object.fromEntries(Array.from({length: 30}, (_, i) => [`2026-09-${String(i + 1).padStart(2, '0')}`, 'shoe' as const])) : exampleGoals[1].calendarRecords};
  return <View style={{width: Math.min(width, 390), height: 844}}><HomeScreen
    goals={[reading, walking]} selectedId={calendar ? 'walking' : 'reading'}
    onSelectGoal={() => {}} onAdd={() => {}} onSettings={() => {}} onAppSettings={() => {}} onSlotPress={() => {}}
    year={2026} month={9} onMonthChange={() => {}} onDateSelect={() => {}}
    allowAnyEmpty dimBoard={completed} boardOverlay={completed ? <Stamp/> : undefined}
    boardFooter={showCompletionAction ? <PixelButton label="완료한 판 이어가기" variant="secondary"/> : undefined}
    recordedSlots={showRecordedMarks ? recordedSlots : undefined}
    recordedDates={showRecordedMarks ? new Set(['2026-09-04', '2026-09-17']) : undefined}/>
  </View>;
}
function DialogLayer({children, shade = true}: {children: ReactNode; shade?: boolean}) {
  return <View style={{position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: shade ? 'rgba(6,38,28,0.42)' : 'transparent', alignItems: 'center', justifyContent: 'center', padding: 20}}>{children}</View>;
}
function ConfirmOverlay({kind = 'existing'}: {kind?: 'existing' | 'ink' | 'separated'}) {
  const {width} = useWindowDimensions();
  return <View style={{width: Math.min(width, 390), height: 844}}><GoalEditorScreen mode="settings" initialGoal={exampleGoals[0]} onBack={() => {}} onSubmit={() => {}} onDelete={() => {}}/>
    <DialogLayer>
      {kind === 'existing' ? <PixelDialog variant="basic" title="목표를 삭제할까요?" description="스티커 6개와 기록 2개도 함께 사라져요. 되돌릴 수 없어요." primaryLabel="삭제하기" secondaryLabel="취소"/> :
        kind === 'ink' ? <PixelFrame variant="dialog" fill={retro.color.dialog} style={{width: '100%'}} contentStyle={{padding: 20, gap: 14}}>
          <PixelText variant="title" style={{textAlign: 'center'}}>목표를 삭제할까요?</PixelText><Copy center>스티커 6개와 기록 2개도 함께 사라져요.</Copy>
          <View style={{flexDirection: 'row', gap: 8}}><PixelButton label="취소" variant="secondary" style={{flex: 1}}/><Pressable style={{flex: 1}}><PixelFrame variant="button" fill={retro.color.ink} contentStyle={{minHeight: 52, justifyContent: 'center', alignItems: 'center'}}><PixelText style={{color: retro.color.secondary}}>삭제하기</PixelText></PixelFrame></Pressable></View>
        </PixelFrame> : <PixelFrame variant="dialog" fill={retro.color.dialog} style={{width: '100%'}} contentStyle={{padding: 20, gap: 12}}>
          <PixelText variant="title" style={{textAlign: 'center'}}>목표를 삭제할까요?</PixelText><Copy center>스티커 6개와 기록 2개도 함께 사라져요. 되돌릴 수 없어요.</Copy>
          <PixelButton label="취소" variant="secondary"/><TextAction label="목표와 기록 삭제하기" icon={<ActionSymbol name="trash" size={18}/>} onPress={() => {}}/>
        </PixelFrame>}
    </DialogLayer>
  </View>;
}
export const ConfirmA: Story = {name: '결정 1A · 일반 화면 다이얼로그', render: () => <ConfirmOverlay/>};
export const ConfirmB: Story = {name: '결정 1B · 어두운 삭제 버튼', render: () => <ConfirmOverlay kind="ink"/>};
export const ConfirmC: Story = {name: '결정 1C · 삭제 텍스트 액션', render: () => <ConfirmOverlay kind="separated"/>};

export const TallyGuidedSlot: Story = {name: '적립판 · 다음 칸만 강조', render: () => <ExistingHome/>};
export const TutorialAnySlot: Story = {name: '튜토리얼 3 · 빈칸 선택', render: () => <Stage><TutorialScreen initialStep={3}/></Stage>};

export const CompletionMoment: Story = {name: '판 완성 · 큰 도장', render: () => <ExistingHome completed/>};
function CompletionChoiceOverlay() {
  const {width} = useWindowDimensions();
  return <View style={{width: Math.min(width, 390), height: 844}}><ExistingHome completed/>
    <DialogLayer shade={false}><PixelFrame variant="dialog" fill={retro.color.dialog} style={{width: '100%'}} contentStyle={{padding: 16, gap: 9}}>
      <PixelText variant="title" style={{fontSize: 24, lineHeight: 30, textAlign: 'center'}}>책 읽기 판 완성!</PixelText>
      <Copy small center>이 판은 그대로 남아요. 다음에 무엇을 할까요?</Copy>
      <PixelButton label="새 목표로 시작"/><PixelButton label="칸을 늘려 이어 쓰기" variant="secondary"/>
      <TextAction label="지금은 닫기" onPress={() => {}}/>
    </PixelFrame></DialogLayer>
  </View>;
}
export const CompletionChoice: Story = {name: '판 완성 · 다음 선택 다이얼로그', render: () => <CompletionChoiceOverlay/>};
export const CompletionReopen: Story = {name: '완료 선택지 · 다시 열기', render: () => <ExistingHome completed showCompletionAction/>};
function GrowCount() {const [count, setCount] = useState('20'); return <Screen title="칸 늘리기"><Status title="책 읽기 · 15칸" detail="붙인 스티커와 기록은 그대로 두고 칸만 더해요."/><SlotCountPicker value={count} onChange={setCount}/><Copy small>현재 15칸보다 큰 수를 입력해 주세요.</Copy><PixelButton label="칸 늘리기" disabled={Number(count) <= 15}/></Screen>;}
export const IncreaseSlots: Story = {name: '완료 뒤 · 칸 늘리기', render: () => <GrowCount/>};
export const CalendarComplete: Story = {name: '달력판 · 이달 완성 도장', render: () => <ExistingHome completed calendar/>};

export const GoalDelete: Story = {name: '목표 설정 · 삭제 진입', render: () => <Stage><GoalEditorScreen mode="settings" initialGoal={exampleGoals[0]} onBack={() => {}} onSubmit={() => {}} onDelete={() => {}}/></Stage>};
function RecordBase({memo = '오늘 한 챕터를 읽었다.', photoPreview}: {memo?: string; photoPreview?: ReactNode}) {
  const {width} = useWindowDimensions();
  return <View style={{width: Math.min(width, 390), height: 844}}><RecordScreen goal={exampleGoals[0]} date="2026년 9월 21일" initialMemo={memo} photoPreview={photoPreview}
    onChoosePhoto={() => {}} onRemovePhoto={() => {}} onBack={() => {}} onSave={() => {}} onRemoveSticker={() => {}} photoActionsInFrame/></View>;
}
function RecordConfirmOverlay() {
  const {width} = useWindowDimensions();
  return <View style={{width: Math.min(width, 390), height: 844}}><RecordBase/>
    <DialogLayer><PixelDialog variant="basic" title="스티커를 뗄까요?" description="사진과 메모도 함께 사라져요." primaryLabel="떼기" secondaryLabel="취소"/></DialogLayer>
  </View>;
}
export const RecordRemoveWithContent: Story = {name: '기록 · 떼기 확인', render: () => <RecordConfirmOverlay/>};
export const RecordRemoveEmpty: Story = {name: '기록 없음 · 바로 떼기', render: () => <RecordBase memo=""/>};
export const RecordPhotoEmpty: Story = {name: '기록 · 사진 없음 · 프레임 안 추가', render: () => <RecordBase memo=""/>};
export const RecordPhotoAttached: Story = {name: '기록 · 사진 있음 · 오른쪽 위 삭제', render: () => <RecordBase photoPreview={<View style={{width: '100%', height: '100%', backgroundColor: retro.color.lcd, alignItems: 'center', justifyContent: 'center', gap: 12}}><StickerGlyph id="flower" size={80}/><Copy>오늘의 사진</Copy></View>}/>};
export const RecordedStickerCorner: Story = {name: '기록 표식 B · 사진 또는 메모', render: () => <ExistingHome showRecordedMarks/>};
export const CalendarRecordedCorner: Story = {name: '달력판 기록 표식 B · 사진 또는 메모', render: () => <ExistingHome calendar showRecordedMarks/>};
export const EmptyGoals: Story = {name: '목표 없음 · 첫 화면', render: () => <Screen><View style={{flexDirection: 'row', alignItems: 'center', gap: 10}}><PixelIcon name="flower" size={44}/><PixelText variant="brand">차곡차곡</PixelText></View><View style={{height: 64}}/><PixelPanel title="첫 판을 만들어요"><View style={{alignItems: 'center', gap: 16, paddingVertical: 28}}><StickerGlyph id="sprout" size={78}/><Copy>작은 목표부터 차곡차곡 기록해요.</Copy></View></PixelPanel><PixelButton label="목표 만들기"/></Screen>};
export const LongGoalNames: Story = {name: '긴 목표 이름 · 칩 검토', render: () => <ExistingHome longName/>};
export const PhotoDenied: Story = {name: '사진 권한 거부', render: () => <Screen title="사진 추가"><Status title="사진에 접근할 수 없어요" detail="기기 설정에서 차곡차곡의 사진 접근을 허용하면 다시 첨부할 수 있어요. 메모는 계속 남길 수 있어요."/><Actions primary="기기 설정 열기" secondary="메모만 남기기"/></Screen>};
export const PhotoMissing: Story = {name: '사진 유실 · 기록 유지', render: () => <RecordBase photoPreview={<View style={{alignItems: 'center', gap: 12}}><ActionSymbol name="photo" size={36}/><Copy>사진을 불러올 수 없어요</Copy></View>}/>};
function UnsavedDialog() {
  return <Stage><RecordBase memo="오늘 읽은 문장이 오래 남는다."/><DialogLayer><PixelDialog variant="basic" title="저장하지 않고 나갈까요?" description="지금 쓴 메모가 사라져요." primaryLabel="계속 쓰기" secondaryLabel="나가기"/></DialogLayer></Stage>;
}
export const UnsavedBack: Story = {name: '저장 안 한 입력 · 나가기', render: () => <UnsavedDialog/>};

/** Native Apple/Google buttons will occupy the reserved brand areas in the app. */
export const LoginInvite: Story = {name: '계정 · 첫 실행 로그인 권유', render: () => <Screen><View style={{height: 40}}/><View style={{alignItems: 'center', gap: 20}}><PixelIcon name="flower" size={54}/><PixelText variant="brand">차곡차곡</PixelText></View><PixelPanel title="기록을 이어가요"><Copy>계정을 연결하면 기기를 바꿔도 목표와 스티커를 다시 가져올 수 있어요.</Copy><View style={{height: 12}}/><Copy small>연결하지 않아도 이 기기에서 바로 시작할 수 있어요.</Copy></PixelPanel><View accessibilityLabel="Apple 및 Google 공식 로그인 버튼 영역" style={{gap: 10}}><Surface><Copy>Apple 공식 로그인 버튼</Copy></Surface><Surface><Copy>Google 공식 로그인 버튼</Copy></Surface></View><TextAction label="나중에 할게요" onPress={() => {}}/></Screen>};
export const AgeCheck: Story = {name: '계정 · 만 14세 확인', render: () => <Screen title="계정 연결"><Status title="만 14세 이상인가요?" detail="계정 연결은 만 14세 이상만 할 수 있어요."/><Actions primary="네, 만 14세 이상이에요" secondary="아니요"/></Screen>};
export const UnderAge: Story = {name: '계정 · 14세 미만', render: () => <Screen title="계정 연결"><Status title="이 기기에서 계속 쓸 수 있어요" detail="계정 연결은 할 수 없지만 목표와 스티커는 이 기기에 저장하며 사용할 수 있어요."/><Actions primary="목표 만들기"/></Screen>};
export const SettingsTop: Story = {name: '앱 설정 · 홈 최상단 진입', render: () => <ExistingHome/>};
export const AppSettings: Story = {name: '앱 설정 · 연결 상태', render: () => <Screen title="앱 설정"><PixelPanel title="계정과 백업"><SettingRow label="연결된 계정" value="Apple" navigates={false}/><Rule/><SettingRow label="마지막 백업" value="오늘 9:20" navigates={false}/><Rule/><SettingRow label="올리지 못한 변경" value="없음" navigates={false}/></PixelPanel><Surface><SettingRow label="튜토리얼 다시 보기"/><Rule/><SettingRow label="이용약관"/><Rule/><SettingRow label="개인정보 처리방침"/><Rule/><SettingRow label="오픈소스 라이선스"/></Surface><TextAction label="로그아웃" onPress={() => {}}/><TextAction label="계정 삭제" onPress={() => {}}/></Screen>};
export const AppSettingsLocal: Story = {name: '앱 설정 · 계정 없이 사용', render: () => <Screen title="앱 설정"><PixelPanel title="이 기기의 기록"><Copy>지금은 이 기기에만 저장하고 있어요.</Copy><View style={{height: 12}}/><PixelButton label="계정 연결하기"/></PixelPanel><Surface><SettingRow label="튜토리얼 다시 보기"/><Rule/><SettingRow label="이용약관"/><Rule/><SettingRow label="개인정보 처리방침"/><Rule/><SettingRow label="오픈소스 라이선스"/></Surface></Screen>};
export const AppSettingsOffline: Story = {name: '앱 설정 · 오프라인 백업 대기', render: () => <Screen title="앱 설정"><PixelPanel title="백업 상태"><Copy>기록은 이 기기에 저장했어요.</Copy><Rule/><Copy>올리지 못한 변경 3개</Copy><Copy small>인터넷에 연결되면 자동으로 백업해요.</Copy></PixelPanel><SettingRow label="마지막 백업" value="어제 21:10"/></Screen>};
function NoticeOverlay() {
  const {width} = useWindowDimensions();
  return <View style={{width: Math.min(width, 390), height: 844}}><ExistingHome/>
    <View style={{position: 'absolute', left: 20, right: 20, bottom: 22}}><ShortNotice title="이 기기에 기록했어요" detail="연결되면 자동으로 백업해요."/></View>
  </View>;
}
export const BackupNotice: Story = {name: '공통 알림 · 백업 대기', render: () => <NoticeOverlay/>};
function RestoreChoice({kind, selected, onPress}: {kind: 'server' | 'local'; selected: boolean; onPress: () => void}) {
  const server = kind === 'server';
  const title = server ? '서버 백업' : '이 기기 기록';
  return <Pressable accessibilityRole="radio" accessibilityLabel={title} accessibilityState={{checked: selected}} onPress={onPress} style={{flex: 1}}>
    <PixelFrame variant="selection" fill={selected ? retro.color.primary : retro.color.lcd} contentStyle={{padding: selected ? 6 : 0}}>
      <PixelFrame variant="input" fill={retro.color.lcd} contentStyle={{height: 154, padding: 10, gap: 7}}>
        <View style={{minHeight: 30, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'}}><PixelText variant="title" style={{fontSize: 18, lineHeight: 26, flex: 1}}>{title}</PixelText>{selected && <ActionSymbol name="check" size={16}/>}</View>
        <Rule/><Copy small>목표 {server ? 4 : 2}개</Copy><Copy small>스티커 {server ? 38 : 12}개</Copy><PixelText style={{fontSize: 12, lineHeight: 16}}>수정: 9월 {server ? 27 : 28}일</PixelText>
      </PixelFrame>
    </PixelFrame>
  </Pressable>;
}
function RestoreConflictScreen() {
  const [selected, setSelected] = useState<'server' | 'local'>('server');
  return <Screen title="기록 복원"><PixelText variant="title" style={{fontSize: 25, lineHeight: 34}}>어느 기록을 사용할까요?</PixelText>
    <Copy small>두 곳에 기록이 있어요. 사용할 기록을 선택해 주세요.</Copy>
    <View accessibilityRole="radiogroup" style={{flexDirection: 'row', gap: 10}}><RestoreChoice kind="server" selected={selected === 'server'} onPress={() => setSelected('server')}/><RestoreChoice kind="local" selected={selected === 'local'} onPress={() => setSelected('local')}/></View>
    <Copy small>선택하지 않은 쪽의 기록은 사라져요.</Copy>
    <PixelButton label={selected === 'server' ? '서버 백업 사용하기' : '이 기기 기록 사용하기'} onPress={() => {}}/>
  </Screen>;
}
export const RestoreConflict: Story = {name: '복원 · 두 기록 선택', render: () => <RestoreConflictScreen/>};
export const RestoreProgress: Story = {name: '복원 · 진행', render: () => <Screen title="기록 복원"><View style={{height: 100}}/><PixelLoadingIndicator/><Status title="기록을 가져오고 있어요" detail="목표와 스티커, 사진을 차례로 내려받고 있어요."/><Copy small>앱을 닫아도 다음에 다시 시도할 수 있어요.</Copy></Screen>};
export const RestoreFailed: Story = {name: '복원 · 실패', render: () => <Screen title="기록 복원"><Status title="기록을 가져오지 못했어요" detail="연결 상태를 확인하고 다시 시도해 주세요. 이 기기의 기록은 그대로 있어요."/><Actions primary="다시 시도" secondary="나중에 하기"/></Screen>};
export const LogoutProgress: Story = {name: '로그아웃 · 백업 중', render: () => <Screen title="로그아웃"><PixelLoadingIndicator label="백업 중"/><Status title="변경한 기록을 올리고 있어요" detail="백업이 끝나면 이 기기의 기록을 지우고 로그아웃해요."/><Copy small>올리지 못한 변경 3개</Copy></Screen>};
export const LogoutFailed: Story = {name: '로그아웃 · 백업 실패', render: () => <Screen title="로그아웃"><Status title="아직 로그아웃할 수 없어요" detail="변경한 기록을 올리지 못했어요. 이 기기의 기록은 그대로 보관했어요."/><Actions primary="다시 백업하기" secondary="앱 설정으로 돌아가기"/></Screen>};
export const AccountDelete: Story = {name: '계정 삭제 · 내용 확인', render: () => <Screen title="계정 삭제"><Status title="계정과 기록이 사라져요" detail="서버에 저장된 목표, 스티커, 메모, 사진과 계정을 삭제해요. 되돌릴 수 없어요."/><Actions primary="삭제 내용 확인" secondary="취소"/></Screen>};
export const AccountDeleteConfirm: Story = {name: '계정 삭제 · 최종 확인', render: () => <Screen title="계정 삭제"><Status title="계정을 삭제할까요?" detail="서버 백업과 사진도 영구 삭제돼요."/><PixelInput label="확인하려면 삭제 입력" value="삭제"/><Actions primary="계정 영구 삭제" secondary="취소"/></Screen>};
export const AccountDeleteDone: Story = {name: '계정 삭제 · 완료', render: () => <Screen title="계정 삭제"><Status title="계정을 삭제했어요" detail="서버의 계정과 기록 삭제가 완료됐어요."/><Actions primary="처음으로"/></Screen>};
export const AccountDeleteFailed: Story = {name: '계정 삭제 · 네트워크 실패', render: () => <Screen title="계정 삭제"><Status title="삭제를 완료하지 못했어요" detail="네트워크에 연결한 뒤 다시 시도해 주세요. 완료되기 전에는 계정과 기록이 남아 있어요."/><Actions primary="다시 시도" secondary="앱 설정으로 돌아가기"/></Screen>};
export const LegalList: Story = {name: '약관과 라이선스 · 목록', render: () => <Screen title="약관과 라이선스"><Surface><SettingRow label="이용약관"/><Rule/><SettingRow label="개인정보 처리방침"/><Rule/><SettingRow label="오픈소스 라이선스"/></Surface></Screen>};
export const LicenseDetail: Story = {name: '라이선스 · 상세', render: () => <Screen title="오픈소스 라이선스"><PixelPanel title="Neo둥근모"><Copy>SIL Open Font License 1.1</Copy><Rule/><Copy small>라이선스 전문을 이 영역에서 읽을 수 있어요.</Copy></PixelPanel><SettingRow label="그 밖의 오픈소스 라이선스"/></Screen>};
