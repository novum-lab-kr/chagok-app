import { oneBoardOnline, SLOT_TAKEN_GATHER_MS, watchSlotTaken } from '../src/app-data/sharedBoardGuards';
import { notifySlotTaken } from '../src/sync/slotTaken';
import type { Goal } from '../src/domain/types';

jest.mock('expo-network', () => ({ getNetworkStateAsync: jest.fn() }));

const goal = (mode: Goal['mode']): Goal => ({
  id: 'g1', mode, role: 'member', name: '걷기', boardType: 'tally', totalSlots: 10, initialSlots: 10, defaultStickerId: 'basic.shoe',
  createdAt: 0, endDate: null, completedAt: null, completionSeen: true, lastPlacedAt: null, sortOrder: null,
});

describe('oneBoardOnline (판 화면의 붙이기 앞 확인)', () => {
  it('한 판에 연결이 없으면 「연결되면 붙일 수 있어요」를 보이고 붙이지 않는다', async () => {
    const offline = jest.fn(async () => {});
    const save = jest.fn();
    // 판 화면의 place()와 같은 순서: 확인을 통과해야 저장한다(창 문구는 together-screens.test.tsx)
    if (await oneBoardOnline(goal('one'), offline, async () => false)) save();
    expect(save).not.toHaveBeenCalled();
    expect(offline).toHaveBeenCalledTimes(1);
  });

  it('한 판에 연결이 있으면 창 없이 붙인다', async () => {
    const ask = jest.fn();
    expect(await oneBoardOnline(goal('one'), ask, async () => true)).toBe(true);
    expect(ask).not.toHaveBeenCalled();
  });

  it('혼자 판과 각자 판은 연결을 보지 않는다', async () => {
    const online = jest.fn(async () => false);
    const ask = jest.fn();
    expect(await oneBoardOnline(goal('solo'), ask, online)).toBe(true);
    expect(await oneBoardOnline(goal('each'), ask, online)).toBe(true);
    expect(online).not.toHaveBeenCalled();
    expect(ask).not.toHaveBeenCalled();
  });
});

describe('watchSlotTaken (「이미 누가 붙였어요」)', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('이 목표의 칸이 같은 회차에 여러 번 지워져도 한 번만 알린다', () => {
    const onTaken = jest.fn();
    const off = watchSlotTaken('g1', onTaken);
    notifySlotTaken('g1');
    notifySlotTaken('g1');
    notifySlotTaken('g1');
    expect(onTaken).not.toHaveBeenCalled();
    jest.advanceTimersByTime(SLOT_TAKEN_GATHER_MS);
    expect(onTaken).toHaveBeenCalledTimes(1);
    // 다음 회차는 다시 알린다
    notifySlotTaken('g1');
    jest.advanceTimersByTime(SLOT_TAKEN_GATHER_MS);
    expect(onTaken).toHaveBeenCalledTimes(2);
    off();
  });

  it('다른 목표의 알림에는 알리지 않는다', () => {
    const onTaken = jest.fn();
    const off = watchSlotTaken('g1', onTaken);
    notifySlotTaken('other');
    jest.advanceTimersByTime(SLOT_TAKEN_GATHER_MS * 2);
    expect(onTaken).not.toHaveBeenCalled();
    off();
  });

  it('그만 들으면(화면을 떠나면) 모으던 알림도 버린다', () => {
    const onTaken = jest.fn();
    const off = watchSlotTaken('g1', onTaken);
    notifySlotTaken('g1');
    off();
    jest.advanceTimersByTime(SLOT_TAKEN_GATHER_MS);
    notifySlotTaken('g1');
    jest.advanceTimersByTime(SLOT_TAKEN_GATHER_MS);
    expect(onTaken).not.toHaveBeenCalled();
  });
});
