import { SupabaseSyncServer } from '../../src/sync/supabaseServer';
import { describeSyncServerContract } from '../support/syncServerContract';
import { describeIfServer, newUser } from './support';

describeSyncServerContract('Supabase 개발 프로젝트', async () => {
  const { client } = await newUser();
  return new SupabaseSyncServer({ rpc: (fn, args) => client.rpc(fn, args) });
}, describeIfServer);
