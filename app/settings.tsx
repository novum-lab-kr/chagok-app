import { useRouter } from 'expo-router';
import { PixelPanel, PixelText, RetroScreen, ScreenHeader, SettingRow } from '../src/design-system';
import { goBackOrHome } from '../src/app-data/goBack';

/** 계정 연결 전에도 앱 설정과 로컬 저장 상태에 들어갈 수 있는 기본 화면. */
export default function AppSettings() {
  const router = useRouter();
  return (
    <RetroScreen style={{ gap: 16 }} header={<ScreenHeader title="앱 설정" onBack={goBackOrHome} />}>
      <PixelPanel title="이 기기의 기록">
        <PixelText>지금은 이 기기에만 저장하고 있어요.</PixelText>
      </PixelPanel>
      <PixelPanel title="도움말">
        <SettingRow label="사용법 다시 보기" onPress={() => router.push('/tutorial')} />
      </PixelPanel>
      <PixelPanel title="정보">
        <SettingRow label="약관과 라이선스" onPress={() => router.push('/policies')} />
      </PixelPanel>
    </RetroScreen>
  );
}
