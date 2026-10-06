import { createGoal, deleteGoal } from '../src/repositories/goalRepository';
import { listStickers, placeSticker } from '../src/repositories/stickerRepository';
import { upsertRecord } from '../src/repositories/recordRepository';
import { localDateKey } from '../src/domain/dates';
import { applyWidgetRequests } from '../src/widgets/applyRequests';
import type { WidgetRequest } from '../src/widgets/requests';
import { withFreshDb } from './support/setup';

withFreshDb();

const now = Date.now();
const today = localDateKey(now);
const add = (goalId: string, id: string, at = now): WidgetRequest => ({ id, goalId, kind: 'add', at, dateKey: localDateKey(at) });
const undo = (goalId: string, id: string, at = now): WidgetRequest => ({ id, goalId, kind: 'undo', at, dateKey: today });

describe('applyWidgetRequests', () => {
  it('요청 id를 스티커 id로 붙인다', async () => {
    const g = await createGoal({ name: '독서', boardType: 'tally', totalSlots: 10 });
    expect(await applyWidgetRequests([add(g.id, 'w1')])).toEqual({ handled: ['w1'], changed: true });
    expect((await listStickers(g.id)).map((s) => s.id)).toEqual(['w1']);
  });

  it('같은 요청을 두 번 처리해도 한 장 (Review Focus 3)', async () => {
    const g = await createGoal({ name: '독서', boardType: 'tally', totalSlots: 10 });
    await applyWidgetRequests([add(g.id, 'w1')]);
    expect(await applyWidgetRequests([add(g.id, 'w1')])).toEqual({ handled: ['w1'], changed: false });
    expect(await listStickers(g.id)).toHaveLength(1);
  });

  it('시각 순서대로 처리한다: 붙이고 되돌리면 남는 것이 없다', async () => {
    const g = await createGoal({ name: '산책', boardType: 'calendar', totalSlots: null });
    const out = await applyWidgetRequests([undo(g.id, 'w2', now + 1), add(g.id, 'w1')]);
    expect(out.handled).toEqual(['w1', 'w2']);
    expect(await listStickers(g.id)).toHaveLength(0);
  });

  it('지운 목표·완성한 판은 건너뛴다 (Review Focus 4)', async () => {
    const g = await createGoal({ name: '산책', boardType: 'calendar', totalSlots: null });
    await deleteGoal(g.id);
    expect(await applyWidgetRequests([add(g.id, 'w1')])).toEqual({ handled: ['w1'], changed: false });
  });

  it('기록이 있으면 떼지 않는다 (Review Focus 6)', async () => {
    const g = await createGoal({ name: '산책', boardType: 'calendar', totalSlots: null });
    const s = await placeSticker(g.id, new Date(now).getDate() - 1);
    await upsertRecord(s.id, { memo: '좋았다', photoUri: null });
    await applyWidgetRequests([undo(g.id, 'w1')]);
    expect(await listStickers(g.id)).toHaveLength(1);
  });

  it('되돌리기 요청을 다시 처리해도 한 장만 뗀다', async () => {
    const g = await createGoal({ name: '독서', boardType: 'tally', totalSlots: 10 });
    await placeSticker(g.id, 0);
    await placeSticker(g.id, 1);
    expect(await applyWidgetRequests([undo(g.id, 'u1')])).toEqual({ handled: ['u1'], changed: true });
    expect(await listStickers(g.id)).toHaveLength(1);
    expect(await applyWidgetRequests([undo(g.id, 'u1')])).toEqual({ handled: ['u1'], changed: false });
    expect(await listStickers(g.id)).toHaveLength(1);
  });

  it('붙이고 되돌린 뒤 같은 요청을 다시 처리해도 다시 붙지 않는다', async () => {
    const g = await createGoal({ name: '산책', boardType: 'calendar', totalSlots: null });
    const reqs = [add(g.id, 'w1'), undo(g.id, 'w2', now + 1)];
    await applyWidgetRequests(reqs);
    expect(await listStickers(g.id)).toHaveLength(0);
    await applyWidgetRequests(reqs);
    expect(await listStickers(g.id)).toHaveLength(0);
  });
});
