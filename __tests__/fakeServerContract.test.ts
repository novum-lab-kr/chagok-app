import { randomUUID } from 'node:crypto';
import { FakeServer } from './support/fakeServer';
import { describeSyncServerContract } from './support/syncServerContract';

// 실제 개발 서버처럼 모든 시험 사용자가 한 서버를 함께 쓴다.
const world = new FakeServer();

describeSyncServerContract('FakeServer', async () => {
  const server = world.as(randomUUID());
  return {
    server,
    userId: server.userId,
    createSharedGoal: async (mode) => server.createSharedGoal({ mode }),
    join: async (code, name, sticker) => {
      const result = server.join(code, name, sticker);
      if ('error' in result) throw new Error(result.error);
    },
    leave: async (goalId) => server.leave(goalId),
  };
});
