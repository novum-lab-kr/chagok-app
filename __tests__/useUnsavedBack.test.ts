import { backAction } from '../src/app-data/useUnsavedBack';

// 화면 모듈은 쓰지 않는다. 뒤로 가기 판단만 본다.
jest.mock('react-native', () => ({ BackHandler: {}, Platform: { OS: 'ios' } }));
jest.mock('expo-router', () => ({ router: {}, useFocusEffect: jest.fn(), useNavigation: jest.fn() }));
jest.mock('../src/design-system', () => ({ PixelDialogModal: () => null, boardDialogs: {} }));

describe('뒤로 가기 판단 (useUnsavedBack)', () => {
  it('입력이 없으면 떠나고, 있으면 묻는다', () => {
    expect(backAction(false, false)).toBe('leave');
    expect(backAction(true, false)).toBe('ask');
  });
  it('저장 중(함께 목표 만들기 서버 호출, 공유 창)에는 입력과 상관없이 머문다', () => {
    expect(backAction(false, true)).toBe('stay');
    expect(backAction(true, true)).toBe('stay');
  });
});
