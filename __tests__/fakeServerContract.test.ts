import { FakeServer } from './support/fakeServer';
import { describeSyncServerContract } from './support/syncServerContract';

describeSyncServerContract('FakeServer', async () => new FakeServer());
