import { SupabaseSyncServer } from '../../src/sync/supabaseServer';
import { describeSyncServerContract } from '../support/syncServerContract';
import { describeIfServer, newUser } from './support';

describeSyncServerContract('Supabase 개발 프로젝트', async () => {
  const { client, userId } = await newUser();
  const call = async <T>(fn: string, args: Record<string, unknown>): Promise<T> => {
    const { data, error } = await client.rpc(fn, args);
    if (error) throw new Error(error.message);
    return data as T;
  };
  return {
    server: new SupabaseSyncServer({ rpc: (fn, args) => client.rpc(fn, args) }),
    userId,
    createSharedGoal: async (mode) => {
      const data = await call<{ goal_id: string; invite_code: string }>('create_shared_goal', {
        p_mode: mode, p_name: '같이 걷기', p_board_type: 'tally', p_total_slots: 10, p_end_date: null,
        p_display_name: '은주', p_sticker_id: 'basic.clover',
      });
      return { goalId: data.goal_id, inviteCode: data.invite_code };
    },
    join: async (code, name, sticker) => {
      const data = await call<{ error?: string }>('join_goal', { p_code: code, p_display_name: name, p_sticker_id: sticker });
      if (data.error) throw new Error(data.error);
    },
    leave: async (goalId) => (await call<{ solo_goal_id: string | null }>('leave_goal', { p_goal_id: goalId })).solo_goal_id,
  };
}, describeIfServer);
