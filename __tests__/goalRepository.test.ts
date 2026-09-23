import {
  createGoal, listGoals, getGoal, deleteGoal, updateGoal,
} from '../src/repositories/goalRepository';
import { useFreshDb } from './support/setup';

useFreshDb();

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
    expect(g.defaultStickerId).toBe('sprout');
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

  it('목표를 지운다', async () => {
    const g = await createGoal({ name: '지울것', boardType: 'tally', totalSlots: 5 });
    await deleteGoal(g.id);
    expect(await getGoal(g.id)).toBeNull();
  });
});
