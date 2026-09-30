import { useLocalSearchParams } from 'expo-router';
import { LicenseDetailScreen } from '../../src/design-system';
import { goBackOrHome } from '../../src/app-data/goBack';
import { LICENSES } from '../../src/policy/licenses';

export default function LicenseDetail() {
  const { license } = useLocalSearchParams<{ license: string }>();
  const entry = LICENSES.find((l) => l.id === license) ?? LICENSES[0];
  return <LicenseDetailScreen name={entry.name} license={entry.license} text={entry.text} onBack={goBackOrHome} />;
}
