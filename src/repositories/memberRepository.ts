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

/** 정원에 드는 멤버 수. 보기만 하는 사람(viewer)은 뺀다. */
export async function countMembers(goalId: string): Promise<number> {
  const db = await getDb();
  const row = await db.first<{ n: number }>(
    "SELECT COUNT(*) AS n FROM goal_members WHERE goal_id = ? AND role != 'viewer'",
    goalId,
  );
  return row?.n ?? 0;
}
