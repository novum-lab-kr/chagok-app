import {
  createGoal, listGoals, getGoal, deleteGoal, updateGoal, completeGoal, markCompletionSeen, reopenGoal,
  extendSlots, extendEndDate, settleExpiredPeriods, countGoalContents, listGoalSummaries,
} from '../src/repositories/goalRepository';
import { placeSticker } from '../src/repositories/stickerRepository';
import { upsertRecord } from '../src/repositories/recordRepository';
import { withFreshDb } from './support/setup';

withFreshDb();

describe('goalRepository', () => {
  it('목표를 만들고 id를 부여한다', async () => {
    const g = await createGoal({ name: '러닝 30회', boardType: 'tally', totalSlots: 30 });
    expect(g.id).toBeTruthy();
    expect(g.name).toBe('러닝 30회');
    expect(g.totalSlots).toBe(30);
  });

  it('calendar 목표는 totalSlots가 null이다', async () => {
    const g = await createGoal({ name: '매일 독서', boardType: 'calendar', totalSlots: 30 });
    expect(g.totalSlots).toBeNull();
  });

  it('목표를 최신순으로 나열한다', async () => {
    await createGoal({ name: '첫번째', boardType: 'tally', totalSlots: 10 });
    await new Promise((r) => setTimeout(r, 2));
    await createGoal({ name: '두번째', boardType: 'tally', totalSlots: 10 });
    const list = await listGoals();
    expect(list[0].name).toBe('두번째');
  });

  it('id로 목표를 찾는다', async () => {
    const g = await createGoal({ name: '찾기', boardType: 'tally', totalSlots: 5 });
    expect((await getGoal(g.id))?.name).toBe('찾기');
  });

  it('없는 id면 null을 준다', async () => {
    expect(await getGoal('nope')).toBeNull();
  });

  it('기본 스티커를 저장한다', async () => {
    const g = await createGoal({
      name: '산책', boardType: 'calendar', totalSlots: null, defaultStickerId: 'shoe',
    });
    expect(g.defaultStickerId).toBe('shoe');
    expect((await getGoal(g.id))?.defaultStickerId).toBe('shoe');
  });

  it('기본 스티커를 안 주면 새싹이가 된다', async () => {
    const g = await createGoal({ name: '독서', boardType: 'tally', totalSlots: 10 });
    expect(g.defaultStickerId).toBe('basic.sprout');
  });

  it('이름과 기본 스티커를 바꿀 수 있다', async () => {
    const g = await createGoal({ name: '산책', boardType: 'calendar', totalSlots: null });
    await updateGoal(g.id, { name: '아침 산책', defaultStickerId: 'cat' });
    const after = await getGoal(g.id);
    expect(after?.name).toBe('아침 산책');
    expect(after?.defaultStickerId).toBe('cat');
  });

  it('목표마다 기본 스티커가 독립적이다', async () => {
    const a = await createGoal({ name: 'A', boardType: 'tally', totalSlots: 5, defaultStickerId: 'star' });
    const b = await createGoal({ name: 'B', boardType: 'tally', totalSlots: 5, defaultStickerId: 'book' });
    await updateGoal(a.id, { defaultStickerId: 'flower' });
    expect((await getGoal(a.id))?.defaultStickerId).toBe('flower');
    expect((await getGoal(b.id))?.defaultStickerId).toBe('book');
  });

  it('새 목표는 진행 중이고 붙인 적이 없다', async () => {
    const g = await createGoal({ name: '새것', boardType: 'tally', totalSlots: 15 });
    expect(g).toMatchObject({ endDate: null, completedAt: null, completionSeen: false, lastPlacedAt: null });
    expect(await getGoal(g.id)).toEqual(g);
  });

  it('적립판은 만들 때의 칸 수를 initialSlots로 남긴다', async () => {
    const t = await createGoal({ name: '적립', boardType: 'tally', totalSlots: 12 });
    const c = await createGoal({ name: '달력', boardType: 'calendar', totalSlots: null });
    expect((await getGoal(t.id))?.initialSlots).toBe(12);
    expect((await getGoal(c.id))?.initialSlots).toBeNull();
  });

  it('달력판은 종료일을 저장하고, 적립판은 종료일을 버린다', async () => {
    const c = await createGoal({ name: '달력', boardType: 'calendar', totalSlots: null, endDate: '2026-10-31' });
    const t = await createGoal({ name: '적립', boardType: 'tally', totalSlots: 5, endDate: '2026-10-31' });
    expect((await getGoal(c.id))?.endDate).toBe('2026-10-31');
    expect((await getGoal(t.id))?.endDate).toBeNull();
  });

  it('목표를 지운다', async () => {
    const g = await createGoal({ name: '지울것', boardType: 'tally', totalSlots: 5 });
    await deleteGoal(g.id);
    expect(await getGoal(g.id)).toBeNull();
  });
});

describe('완성·계속하기 (PRD 4.7)', () => {
  it('완성하면 완성 흐름을 기다리고, 닫기를 고르면 끝난다', async () => {
    const g = await createGoal({ name: '판', boardType: 'tally', totalSlots: 5 });
    await completeGoal(g.id, 123);
    expect(await getGoal(g.id)).toMatchObject({ completedAt: 123, completionSeen: false });
    await markCompletionSeen(g.id);
    expect((await getGoal(g.id))?.completionSeen).toBe(true);
  });

  it('칸을 늘리면 진행 중으로 돌아가고 칸 수가 더해진다', async () => {
    const g = await createGoal({ name: '판', boardType: 'tally', totalSlots: 15 });
    await completeGoal(g.id, 1);
    await extendSlots(g.id, 15);
    expect(await getGoal(g.id)).toMatchObject({ totalSlots: 30, initialSlots: 15, completedAt: null, completionSeen: false });
  });

  it('더할 칸 수가 1보다 작으면 거부한다', async () => {
    const g = await createGoal({ name: '판', boardType: 'tally', totalSlots: 15 });
    await expect(extendSlots(g.id, 0)).rejects.toThrow();
  });

  it('종료일을 늘리면 진행 중으로 돌아간다', async () => {
    const g = await createGoal({ name: '달력', boardType: 'calendar', totalSlots: null, endDate: '2026-09-23' });
    await completeGoal(g.id, 1);
    await extendEndDate(g.id, '2026-10-31');
    expect(await getGoal(g.id)).toMatchObject({ endDate: '2026-10-31', completedAt: null });
  });

  it('기간 없는 달력판은 완성을 풀 수 있다', async () => {
    const g = await createGoal({ name: '달력', boardType: 'calendar', totalSlots: null });
    await completeGoal(g.id, 1);
    await reopenGoal(g.id);
    expect(await getGoal(g.id)).toMatchObject({ completedAt: null, completionSeen: false });
  });
});

describe('종료일 (PRD 4.3)', () => {
  it('목표 설정에서 종료일을 정하고 지운다', async () => {
    const g = await createGoal({ name: '달력', boardType: 'calendar', totalSlots: null });
    await updateGoal(g.id, { endDate: '2026-12-31' });
    expect((await getGoal(g.id))?.endDate).toBe('2026-12-31');
    await updateGoal(g.id, { endDate: null });
    expect((await getGoal(g.id))?.endDate).toBeNull();
  });

  it('종료일이 지난 진행 중 달력판을 종료일 다음 날 0시로 완성한다', async () => {
    const over = await createGoal({ name: '지남', boardType: 'calendar', totalSlots: null, endDate: '2026-09-23' });
    const today = await createGoal({ name: '오늘까지', boardType: 'calendar', totalSlots: null, endDate: '2026-09-29' });
    const open = await createGoal({ name: '없음', boardType: 'calendar', totalSlots: null });
    await settleExpiredPeriods(new Date(2026, 8, 29, 10));
    expect(await getGoal(over.id)).toMatchObject({ completedAt: new Date(2026, 8, 24).getTime(), completionSeen: false });
    expect((await getGoal(today.id))?.completedAt).toBeNull();
    expect((await getGoal(open.id))?.completedAt).toBeNull();
  });

  it('이미 완성한 판의 완성 시각은 바꾸지 않는다', async () => {
    const g = await createGoal({ name: '지남', boardType: 'calendar', totalSlots: null, endDate: '2026-09-23' });
    await completeGoal(g.id, 5);
    await settleExpiredPeriods(new Date(2026, 8, 29, 10));
    expect((await getGoal(g.id))?.completedAt).toBe(5);
  });
});

describe('삭제 (PRD 4.4)', () => {
  it('함께 지워질 스티커 수와 내용이 있는 기록 수를 센다', async () => {
    const g = await createGoal({ name: '판', boardType: 'tally', totalSlots: 5 });
    const a = await placeSticker(g.id, 0);
    const b = await placeSticker(g.id, 1);
    await placeSticker(g.id, 2);
    await upsertRecord(a.id, { photoUri: null, memo: '메모' });
    await upsertRecord(b.id, { photoUri: null, memo: '  ' });
    expect(await countGoalContents(g.id)).toEqual({ stickers: 3, records: 1 });
  });

  it('지우면 그 목표 기록의 사진 경로를 돌려준다', async () => {
    const g = await createGoal({ name: '판', boardType: 'tally', totalSlots: 5 });
    const a = await placeSticker(g.id, 0);
    await upsertRecord(a.id, { photoUri: 'record-photo:x.jpg', memo: null });
    expect(await deleteGoal(g.id)).toEqual(['record-photo:x.jpg']);
    expect(await getGoal(g.id)).toBeNull();
  });
});

describe('목록 요약 (PRD 4.1, 6.3)', () => {
  it('목표마다 전체 붙은 수와 기준 달에 붙은 수를 준다', async () => {
    const g = await createGoal({ name: '달력', boardType: 'calendar', totalSlots: null });
    const t = await createGoal({ name: '적립', boardType: 'tally', totalSlots: 5 });
    await placeSticker(g.id, 0);
    await placeSticker(t.id, 0);
    await placeSticker(t.id, 1);
    const now = new Date();
    const rows = await listGoalSummaries(now);
    const byId = Object.fromEntries(rows.map((r) => [r.goal.id, r]));
    expect(byId[g.id]).toMatchObject({ placedAll: 1, placedInBasis: 1 });
    expect(byId[t.id]).toMatchObject({ placedAll: 2, placedInBasis: 2 });
  });

  it('기간 없는 달력판의 기준 달이 아닌 달의 스티커는 기준 수에 넣지 않는다', async () => {
    const g = await createGoal({ name: '달력', boardType: 'calendar', totalSlots: null });
    await placeSticker(g.id, 0);
    const nextMonth = new Date(); nextMonth.setMonth(nextMonth.getMonth() + 1, 15);
    const [row] = await listGoalSummaries(nextMonth);
    expect(row).toMatchObject({ placedAll: 1, placedInBasis: 0 });
  });
});

describe('외래키가 꺼진 연결에서도 (expo 트랜잭션 연결)', () => {
  it('목표를 지우면 스티커와 기록이 남지 않는다', async () => {
    const { getDb } = await import('../src/db/client');
    const db = await getDb();
    await db.exec('PRAGMA foreign_keys = OFF');
    const g = await createGoal({ name: '판', boardType: 'tally', totalSlots: 5 });
    const a = await placeSticker(g.id, 0);
    await upsertRecord(a.id, { photoUri: null, memo: '메모' });
    await deleteGoal(g.id);
    expect(await db.first<{ n: number }>('SELECT COUNT(*) AS n FROM stickers')).toEqual({ n: 0 });
    expect(await db.first<{ n: number }>('SELECT COUNT(*) AS n FROM records')).toEqual({ n: 0 });
  });
});

describe('목표 설정에서 칸 늘리기 (2026-09-30)', () => {
  it('적립판 칸 수를 늘리고, 처음 만든 칸 수는 그대로 둔다', async () => {
    const g = await createGoal({ name: '독서', boardType: 'tally', totalSlots: 30 });
    await updateGoal(g.id, { name: '책 읽기', totalSlots: 45 });
    const after = await getGoal(g.id);
    expect(after).toMatchObject({ name: '책 읽기', totalSlots: 45, initialSlots: 30 });
  });

  it('줄이는 값은 거부하고 아무것도 바꾸지 않는다', async () => {
    const g = await createGoal({ name: '독서', boardType: 'tally', totalSlots: 30 });
    await expect(updateGoal(g.id, { name: '바뀌면 안 됨', totalSlots: 15 })).rejects.toThrow('칸 수는 줄일 수 없습니다.');
    expect(await getGoal(g.id)).toMatchObject({ name: '독서', totalSlots: 30 });
  });

  it('지금과 같은 값은 허용한다', async () => {
    const g = await createGoal({ name: '독서', boardType: 'tally', totalSlots: 30 });
    await updateGoal(g.id, { totalSlots: 30 });
    expect((await getGoal(g.id))?.totalSlots).toBe(30);
  });

  it('정수가 아니거나 1보다 작으면 거부한다', async () => {
    const g = await createGoal({ name: '독서', boardType: 'tally', totalSlots: 30 });
    await expect(updateGoal(g.id, { totalSlots: 31.5 })).rejects.toThrow();
    await expect(updateGoal(g.id, { totalSlots: 0 })).rejects.toThrow();
  });

  it('달력판에는 칸 수를 줄 수 없다', async () => {
    const g = await createGoal({ name: '산책', boardType: 'calendar', totalSlots: null });
    await expect(updateGoal(g.id, { totalSlots: 40 })).rejects.toThrow('적립판만');
  });

  it('완성한 판은 칸 수를 바꿀 수 없다 (계속하기로 늘린다)', async () => {
    const g = await createGoal({ name: '독서', boardType: 'tally', totalSlots: 1 });
    await completeGoal(g.id, Date.now());
    await expect(updateGoal(g.id, { totalSlots: 5 })).rejects.toThrow('완성한 판');
  });
});
