import { createGoal, listGoals, getGoal, deleteGoal } from '../src/repositories/goalRepository';
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

  it('목표를 지운다', async () => {
    const g = await createGoal({ name: '지울것', boardType: 'tally', totalSlots: 5 });
    await deleteGoal(g.id);
    expect(await getGoal(g.id)).toBeNull();
  });
});
