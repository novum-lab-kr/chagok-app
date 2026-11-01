import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { isAnalyticsEnabled, saveAnalyticsEnabled } from '../src/analytics/posthog';
import { isErrorReportEnabled, saveErrorReportEnabled } from '../src/analytics/sentry';
import { goBackOrHome } from '../src/app-data/goBack';
import { AnalyticsConsentSheet, SendInfoScreen } from '../src/design-system';

/** 앱 설정 → 보내는 정보 (PRD 8.2). 저장에 실패하면 칸을 되돌린다. */
export default function SendInfo() {
  const [analyticsEnabled, setAnalyticsChecked] = useState(false);
  const [errorReportEnabled, setErrorReportChecked] = useState(true);
  const [consentVisible, setConsentVisible] = useState(false);
  useFocusEffect(useCallback(() => {
    let alive = true;
    void isAnalyticsEnabled().then((value) => { if (alive) setAnalyticsChecked(value); });
    void isErrorReportEnabled().then((value) => { if (alive) setErrorReportChecked(value); });
    return () => { alive = false; };
  }, []));
  /** 끌 때는 바로 끈다. 켤 때는 같은 동의를 받는다 (제22조의2 만 14세). */
  function toggleAnalytics() {
    if (!analyticsEnabled) {
      setConsentVisible(true);
      return;
    }
    setAnalyticsChecked(false);
    saveAnalyticsEnabled(false).catch(() => setAnalyticsChecked(true));
  }
  function agree() {
    setConsentVisible(false);
    setAnalyticsChecked(true);
    saveAnalyticsEnabled(true).catch(() => setAnalyticsChecked(false));
  }
  /** 답한 것으로 저장해 스티커를 붙일 때 다시 묻지 않는다. */
  function decline() {
    setConsentVisible(false);
    saveAnalyticsEnabled(false).catch(() => {});
  }
  function toggleErrorReport() {
    const next = !errorReportEnabled;
    setErrorReportChecked(next);
    saveErrorReportEnabled(next).catch(() => setErrorReportChecked(!next));
  }
  return <>
    <SendInfoScreen analyticsEnabled={analyticsEnabled} errorReportEnabled={errorReportEnabled} onBack={goBackOrHome} onToggleAnalytics={toggleAnalytics} onToggleErrorReport={toggleErrorReport} />
    <AnalyticsConsentSheet visible={consentVisible} onAgree={agree} onDecline={decline} />
  </>;
}
