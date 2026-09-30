import { useRouter } from 'expo-router';
import { PolicyListScreen } from '../../src/design-system';
import { goBackOrHome } from '../../src/app-data/goBack';
import { useDialog } from '../../src/app-data/useDialog';
import { LICENSES } from '../../src/policy/licenses';
import { openPolicy } from '../../src/policy/openPolicy';

/** 앱 설정 → 약관과 라이선스 (약관 설계). */
export default function Policies() {
  const router = useRouter();
  const { ask, dialog } = useDialog();
  return <>
    <PolicyListScreen
      onBack={goBackOrHome}
      onTerms={() => void openPolicy('terms', ask)}
      onPrivacy={() => void openPolicy('privacy', ask)}
      licenses={LICENSES}
      onLicense={(id) => router.push({ pathname: '/policies/[license]', params: { license: id } })}
    />
    {dialog}
  </>;
}
