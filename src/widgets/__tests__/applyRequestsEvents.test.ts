import { __resetAnalyticsForTest, setAnalyticsClient } from '../../analytics';
import { checkPlaceGate } from '../../app-data/placeGate';
import { getGoal } from '../../repositories/goalRepository';
import { setSetting } from '../../repositories/appSettingsRepository';
import { placeSticker } from '../../repositories/stickerRepository';
import { applyWidgetRequests } from '../applyRequests';
import { planRequest, type WidgetRequest } from '../requests';

jest.mock('../../repositories/goalRepository', () => ({ getGoal: jest.fn() }));
jest.mock('../../repositories/recordRepository', () => ({ listRecordedStickerIds: jest.fn(async () => new Set()) }));
jest.mock('../../repositories/appSettingsRepository', () => ({ getSetting: jest.fn(async () => null), setSetting: jest.fn(async () => {}) }));
jest.mock('../../repositories/stickerRepository', () => ({ listStickers: jest.fn(async () => []), placeSticker: jest.fn(async () => {}), removeSticker: jest.fn(async () => null) }));
jest.mock('../../app-data/placeGate', () => ({ checkPlaceGate: jest.fn(async () => ({ ok: true })) }));
jest.mock('../requests', () => ({ planRequest: jest.fn() }));

const request = (id: string): WidgetRequest => ({ id, goalId: 'goal', kind: 'add', at: 1, dateKey: '2026-10-31' });

function captured() {
  const events: unknown[][] = [];
  setAnalyticsClient({
    capture: (name, properties) => { events.push([name, properties]); },
    screen: () => {},
    identify: () => {},
    isIdentified: () => false,
    clearQueue: () => {},
    reset: () => {},
    setEnabled: () => {},
  });
  return events;
}

beforeEach(() => {
  __resetAnalyticsForTest();
  jest.clearAllMocks();
  (getGoal as jest.Mock).mockResolvedValue({ id: 'goal', boardType: 'tally', defaultStickerId: 'basic.star' });
});

describe('위젯과 워치 요청의 이벤트', () => {
  it('붙이면 어디서 왔는지와 함께 남긴다', async () => {
    const events = captured();
    (planRequest as jest.Mock).mockReturnValue({ action: 'place', slotIndex: 0, placedAt: 1 });
    await applyWidgetRequests([request('place-widget')], 'widget');
    expect(events).toEqual([['sticker_place', { board_type: 'tally', source: 'widget' }]]);
  });

  it('워치가 완성까지 하면 완성도 남긴다', async () => {
    const events = captured();
    (planRequest as jest.Mock).mockReturnValue({ action: 'place', slotIndex: 0, placedAt: 1, complete: true });
    await applyWidgetRequests([request('place-watch')], 'watch');
    expect(events).toEqual([
      ['sticker_place', { board_type: 'tally', source: 'watch' }],
      ['goal_complete', { source: 'watch' }],
    ]);
  });

  it('떼면 남긴다', async () => {
    const events = captured();
    (planRequest as jest.Mock).mockReturnValue({ action: 'remove', stickerId: 'sticker' });
    await applyWidgetRequests([request('remove-widget')], 'widget');
    expect(events).toEqual([['sticker_remove', { source: 'widget' }]]);
  });

  it('건너뛴 요청과 체험이 끝나 붙이지 않은 요청은 남기지 않는다', async () => {
    const events = captured();
    (planRequest as jest.Mock).mockReturnValue({ action: 'skip', reason: 'done' });
    await applyWidgetRequests([request('skip')], 'widget');
    (planRequest as jest.Mock).mockReturnValue({ action: 'place', slotIndex: 0, placedAt: 1 });
    (checkPlaceGate as jest.Mock).mockResolvedValueOnce({ ok: false });
    await applyWidgetRequests([request('gate')], 'widget');
    expect(placeSticker).not.toHaveBeenCalled();
    expect(events).toEqual([]);
  });

  it('처리 표시에 실패해 다시 처리해도 한 번만 남긴다', async () => {
    const events = captured();
    (planRequest as jest.Mock).mockReturnValue({ action: 'place', slotIndex: 0, placedAt: 1 });
    (setSetting as jest.Mock).mockRejectedValueOnce(new Error('db'));
    await applyWidgetRequests([request('retry')], 'widget');
    expect(events).toEqual([]);
    await applyWidgetRequests([request('retry')], 'widget');
    expect(events).toHaveLength(1);
  });
});
