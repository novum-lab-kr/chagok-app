// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { accountDialogs } from './account-screens';
import DeleteAccount from '../../app/account/delete';
import { deleteAccountOnServer, NeedsLoginError } from '../sync/account';

vi.mock('./index', async () => {
  const { accountDialogs: dialogs } = await import('./account-screens');
  return {
    accountDialogs: dialogs,
    AccountDeletedScreen: () => null,
    DeleteAccountScreen: ({ onDelete }: { onDelete: () => void }) => <button onClick={onDelete}>삭제 시작</button>,
    // 닫히는 동안의 내용을 보려고 visible 과 상관없이 제목과 버튼을 그린다
    PixelDialogModal: ({ visible, title, onPrimary, onSecondary }: { visible: boolean; title: string; onPrimary: () => void; onSecondary: () => void }) => (
      <div>
        <p data-testid="dialog-title">{title}</p>
        <p data-testid="dialog-visible">{String(visible)}</p>
        <button onClick={onPrimary}>주 버튼</button>
        <button onClick={onSecondary}>보조 버튼</button>
      </div>
    ),
  };
});
vi.mock('expo-router', () => ({ router: { push: vi.fn(), replace: vi.fn() }, useNavigation: () => ({ setOptions: vi.fn() }) }));
vi.mock('../app-data/goBack', () => ({ goBackOrHome: vi.fn() }));
vi.mock('../app-data/recordPhotos', () => ({ removeAllManagedPhotos: vi.fn() }));
vi.mock('../sync/account', () => {
  class NeedsLogin extends Error {}
  return { deleteAccountOnServer: vi.fn(), NeedsLoginError: NeedsLogin, signOutLocal: vi.fn() };
});
vi.mock('../sync/signIn/expoGoogle', () => ({ revokeGoogle: vi.fn(), signOutGoogle: vi.fn() }));
vi.mock('../sync/signIn/expoKakao', () => ({ signOutKakao: vi.fn() }));
vi.mock('../sync/supabaseClient', () => ({ clearStoredSession: vi.fn(), getSupabase: () => ({}) }));
vi.mock('../sync/syncGate', () => ({ pauseSync: vi.fn(), resumeSync: vi.fn() }));
vi.mock('../sync/wipe', () => ({ wipeDevice: vi.fn() }));

afterEach(cleanup);

const failDelete = async (error: Error) => {
  vi.mocked(deleteAccountOnServer).mockRejectedValue(error);
  render(<DeleteAccount />);
  fireEvent.click(screen.getByText('삭제 시작'));
  await act(async () => { fireEvent.click(screen.getByText('주 버튼')); });
};

describe('계정 삭제 창이 닫히는 동안', () => {
  it('실패 창을 닫으면 삭제 확인 내용으로 바뀌지 않는다', async () => {
    await failDelete(new Error('network'));
    expect(screen.getByTestId('dialog-title').textContent).toBe(accountDialogs.deleteFailed.title);
    fireEvent.click(screen.getByText('보조 버튼'));
    expect(screen.getByTestId('dialog-visible').textContent).toBe('false');
    expect(screen.getByTestId('dialog-title').textContent).toBe(accountDialogs.deleteFailed.title);
  });

  it('로그인 안내 창을 닫아도 삭제 확인 내용으로 바뀌지 않는다', async () => {
    await failDelete(new NeedsLoginError());
    fireEvent.click(screen.getByText('보조 버튼'));
    expect(screen.getByTestId('dialog-visible').textContent).toBe('false');
    expect(screen.getByTestId('dialog-title').textContent).toBe(accountDialogs.deleteNeedsLogin.title);
  });

  it('닫은 뒤 다시 열면 삭제 확인 내용이다', async () => {
    await failDelete(new Error('network'));
    fireEvent.click(screen.getByText('보조 버튼'));
    fireEvent.click(screen.getByText('삭제 시작'));
    expect(screen.getByTestId('dialog-visible').textContent).toBe('true');
    expect(screen.getByTestId('dialog-title').textContent).toBe(accountDialogs.deleteAccount.title);
  });
});
