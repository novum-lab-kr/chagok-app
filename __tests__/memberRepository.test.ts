import { createGoal } from '../src/repositories/goalRepository';
import { countMembers, listMembers } from '../src/repositories/memberRepository';
import { withFreshDb } from './support/setup';
import { getDb } from '../src/db/client';

withFreshDb();

async function addMember(goalId: string, userId: string, role: string, joinedAt: number | null, name: string | null = null) {
  await (await getDb()).run(
    'INSERT INTO goal_members (goal_id, user_id, role, display_name, joined_at) VALUES (?, ?, ?, ?, ?)',
    goalId, userId, role, name, joinedAt,
  );
}

describe('memberRepository', () => {
  it('혼자 목표는 나 하나다', async () => {
    const g = await createGoal({ name: '산책', boardType: 'tally', totalSlots: 3 });
    expect(await listMembers(g.id)).toEqual([
      { goalId: g.id, userId: 'me', isMe: true, role: 'owner', displayName: null, stickerId: 'basic.clover', joinedAt: g.createdAt },
    ]);
    expect(await countMembers(g.id)).toBe(1);
  });

  it('들어온 순서로, 같은 시각이면 user_id순으로 준다. 나만 isMe다', async () => {
    const g = await createGoal({ name: '산책', boardType: 'tally', totalSlots: 3 });
    await addMember(g.id, 'u-b', 'member', g.createdAt + 5, '민');
    await addMember(g.id, 'u-a', 'member', g.createdAt + 5, '지우');
    await addMember(g.id, 'u-c', 'member', g.createdAt + 1, '하늘');
    const members = await listMembers(g.id);
    expect(members.map((m) => m.userId)).toEqual(['me', 'u-c', 'u-a', 'u-b']);
    expect(members.map((m) => m.isMe)).toEqual([true, false, false, false]);
    expect(members[1].displayName).toBe('하늘');
  });

  it('다른 목표의 멤버는 섞이지 않는다', async () => {
    const a = await createGoal({ name: 'a', boardType: 'tally', totalSlots: 3 });
    const b = await createGoal({ name: 'b', boardType: 'tally', totalSlots: 3 });
    await addMember(a.id, 'u1', 'member', 10);
    expect((await listMembers(b.id)).map((m) => m.userId)).toEqual(['me']);
  });

  it('countMembers는 viewer를 뺀다', async () => {
    const g = await createGoal({ name: '산책', boardType: 'tally', totalSlots: 3 });
    await addMember(g.id, 'u1', 'member', 10);
    await addMember(g.id, 'u2', 'viewer', 11);
    expect(await countMembers(g.id)).toBe(2);
    expect(await listMembers(g.id)).toHaveLength(3);
  });
});
