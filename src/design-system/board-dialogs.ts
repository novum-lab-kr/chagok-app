import {t} from '../i18n';

/**
 * 목표·판·기록 화면의 다이얼로그 문구 (PRD 4.3–4.7). 화면 위에 PixelDialogModal로 띄운다.
 * 앱 라우트와 Storybook `Components/Dialog` 문구 모음이 같이 읽는다 — 문구를 바꾸면 사전(src/i18n)만 고친다.
 * 값은 읽는 순간의 언어로 만든다. 그래서 인자 없는 문구도 getter다.
 */
export const boardDialogs={
  /** 마지막 칸(적립판)이나 기간의 마지막 빈 날(달력판)에 붙이기 직전. */
  confirmLast:(kind:'tally'|'calendar')=>({title:t('dialog.confirmComplete'),description:kind==='tally'?t('dialog.confirmLastTally'):t('dialog.confirmLastCalendar'),secondaryLabel:t('common.cancel'),primaryLabel:t('dialog.complete')}),
  /** 기간 없는 달력판의 수동 완성 (목표 설정). */
  get confirmManual(){return {title:t('dialog.confirmComplete'),description:t('dialog.confirmManual'),secondaryLabel:t('common.cancel'),primaryLabel:t('dialog.complete')};},
  /** 완성 연출 뒤. 버튼은 세 판 모두 「계속하기」이고, 무엇을 늘리는지는 설명이 맡는다 (PRD 4.7). */
  completed:(board:'tally'|'period'|'open')=>({
    title:board==='period'?t('dialog.completedPeriodTitle'):t('dialog.completedBoardTitle'),
    description:t(board==='tally'?'dialog.completedTally':board==='period'?'dialog.completedPeriod':'dialog.completedOpen'),
    secondaryLabel:t('common.close'),primaryLabel:t('dialog.continue')}),
  /** 판에서 기록 있는 칸을 꾹 눌렀을 때. */
  get removeSticker(){return {title:t('dialog.removeStickerTitle'),description:t('dialog.removeStickerSlot'),secondaryLabel:t('common.cancel'),primaryLabel:t('dialog.remove')};},
  /** 기록 화면의 [스티커 떼기]. */
  get removeStickerInRecord(){return {title:t('dialog.removeStickerTitle'),description:t('dialog.removeStickerRecord'),secondaryLabel:t('common.cancel'),primaryLabel:t('dialog.remove')};},
  /** description은 함께 지워지는 수 (pocketAdapter deleteDescription). */
  deleteGoal:(description:string)=>({title:t('dialog.deleteGoalTitle'),description,secondaryLabel:t('common.cancel'),primaryLabel:t('common.delete')}),
  get unsaved(){return {title:t('dialog.unsavedTitle'),description:t('dialog.unsavedDescription'),primaryLabel:t('dialog.keepWriting'),secondaryLabel:t('dialog.leave')};},
  get photoDenied(){return {title:t('dialog.photoDeniedTitle'),description:t('dialog.photoDeniedDescription'),secondaryLabel:t('dialog.noteOnly'),primaryLabel:t('dialog.openSettings')};},
  get cameraDenied(){return {title:t('dialog.cameraDeniedTitle'),description:t('dialog.cameraDeniedDescription'),secondaryLabel:t('common.close'),primaryLabel:t('dialog.openSettings')};},
  get cameraUnavailable(){return {title:t('dialog.cameraUnavailableTitle'),description:t('dialog.cameraUnavailableDescription'),primaryLabel:t('common.ok')};},
  /** 저장·붙이기·삭제 실패. title은 결과('저장하지 못했어요' 등). */
  saveFailed:(title:string)=>({title,description:t('dialog.saveFailedDescription'),primaryLabel:t('common.ok')}),
};
