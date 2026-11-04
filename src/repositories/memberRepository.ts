import { getDb } from '../db/client';
import type { GoalMember, MemberRole } from '../domain/types';
import { ME } from './ids';

type MemberRow = {
  goal_id: string;
  user_id: string;
  role: MemberRole;
  display_name: string | null;
  sticker_id: string | null;
  joined_at: number | null;
};

function toMember(r: MemberRow): GoalMember {
  return {
    goalId: r.goal_id,
    userId: r.user_id,
    isMe: r.user_id === ME,
    role: r.role,
    displayName: r.display_name,
    stickerId: r.sticker_id,
    joinedAt: r.joined_at,
  };
}

/** 함께 목표의 멤버를 들어온 순서로. 같은 시각이면 user_id순. */
export async function listMembers(goalId: string): Promise<GoalMember[]> {
  const db = await getDb();
  const rows = await db.all<MemberRow>(
    `SELECT goal_id, user_id, role, display_name, sticker_id, joined_at FROM goal_members
      WHERE goal_id = ? ORDER BY joined_at, user_id`,
    goalId,
  );
  return rows.map(toMember);
}

/** 그 사람이 멤버로 있는 목표 id. 차단한 뒤 그 사람이 있던 목표를 다시 받을 때 쓴다. */
export async function listGoalsWith(userId: string): Promise<string[]> {
  const db = await getDb();
  const rows = await db.all<{ goal_id: string }>('SELECT goal_id FROM goal_members WHERE user_id = ? ORDER BY goal_id', userId);
  return rows.map((r) => r.goal_id);
}

/** 정원에 드는 멤버 수. 보기만 하는 사람(viewer)은 뺀다. */
export async function countMembers(goalId: string): Promise<number> {
  const db = await getDb();
  const row = await db.first<{ n: number }>(
    "SELECT COUNT(*) AS n FROM goal_members WHERE goal_id = ? AND role != 'viewer'",
    goalId,
  );
  return row?.n ?? 0;
}
