import { PixelPanel, PixelText, RetroScreen, ScreenHeader } from '../src/design-system';
import { goBackOrHome } from '../src/app-data/goBack';

/** 계정 연결 전에도 앱 설정과 로컬 저장 상태에 들어갈 수 있는 기본 화면. */
export default function AppSettings() {
  return (
    <RetroScreen style={{ gap: 16 }}>
      <ScreenHeader title="앱 설정" onBack={goBackOrHome} />
      <PixelPanel title="이 기기의 기록">
        <PixelText>지금은 이 기기에만 저장하고 있어요.</PixelText>
      </PixelPanel>
    </RetroScreen>
  );
}
