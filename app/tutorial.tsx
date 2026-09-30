import { FirstRunTutorial } from '../src/design-system';
import { goBackOrHome } from '../src/app-data/goBack';
import { setFlag } from '../src/repositories/appSettingsRepository';

/**
 * 앱 설정 → 사용법 다시 보기 (2026-09-30 A안). 첫 실행과 같은 5단계를 처음부터 보여준다.
 * 튜토리얼은 단계마다 자기 예시 화면을 새로 그리므로 목록의 스크롤 위치와 상관없이 스포트라이트가 맞는다.
 */
export default function TutorialReplay() {
  return <FirstRunTutorial onFinish={() => { void setFlag('tutorialDone', true); goBackOrHome(); }} />;
}
