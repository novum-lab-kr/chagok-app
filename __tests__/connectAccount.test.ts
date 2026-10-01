import { decideConnection } from '../src/sync/connectAccount';

const base = { previousUserId: null, userId: 'u1', deviceHasData: false, serverHasData: false };
it.each([
  [{ ...base, previousUserId: 'u1', deviceHasData: true, serverHasData: true }, 'same'],
  [base, 'linkOnly'],
  [{ ...base, deviceHasData: true }, 'firstBackup'],
  [{ ...base, serverHasData: true }, 'restore'],
  [{ ...base, deviceHasData: true, serverHasData: true }, 'conflict'],
  [{ ...base, previousUserId: 'u0', deviceHasData: true, serverHasData: true }, 'conflict'],
])('%o → %s', (input, expected) => {
  expect(decideConnection(input)).toBe(expected);
});
