import React from 'react';
import {AnalyticsConsentSheet,SendInfoScreen} from '../src/design-system';
import {Stage,noop} from './support/frame';

/** 사용 기록 동의와 보내는 정보 (PRD 8.2). 시트의 자세히 보기를 눌러 펼친다. */
export default {title:'Screens/Analytics Consent',parameters:{layout:'fullscreen',edgeToEdge:true}};
export const Default={name:'동의 시트',render:()=><Stage><AnalyticsConsentSheet visible onAgree={noop} onDecline={noop}/></Stage>};
export const SendInfo={name:'보내는 정보',render:()=><Stage><SendInfoScreen analyticsEnabled={false} errorReportEnabled onBack={noop} onToggleAnalytics={noop} onToggleErrorReport={noop}/></Stage>};
