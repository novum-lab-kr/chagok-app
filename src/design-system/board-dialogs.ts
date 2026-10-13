/**
 * 목표·판·기록 화면의 다이얼로그 문구 (PRD 4.3–4.7). 화면 위에 PixelDialogModal로 띄운다.
 * 앱 라우트와 Storybook `Components/Dialog` 문구 모음이 같이 읽는다 — 문구를 바꾸면 여기만 고친다.
 */
export const boardDialogs={
  /** 마지막 칸(적립판)이나 기간의 마지막 빈 날(달력판)에 붙이기 직전. */
  confirmLast:(kind:'tally'|'calendar')=>({title:'이 판을 완성할까요?',description:kind==='tally'?'마지막 칸이에요. 완성한 뒤에도 칸과 기록은 고칠 수 있어요.':'기간의 마지막 빈 날이에요. 완성한 뒤에도 칸과 기록은 고칠 수 있어요.',secondaryLabel:'취소',primaryLabel:'완성하기'}),
  /** 기간 없는 달력판의 수동 완성 (목표 설정). */
  confirmManual:{title:'이 판을 완성할까요?',description:'완성한 뒤에도 칸과 기록은 고칠 수 있어요. 계속하기로 다시 이어 쓸 수도 있어요.',secondaryLabel:'취소',primaryLabel:'완성하기'},
  /** 완성 연출 뒤. 버튼은 세 판 모두 「계속하기」이고, 무엇을 늘리는지는 설명이 맡는다 (PRD 4.7). */
  completed:(board:'tally'|'period'|'open')=>({
    title:board==='period'?'기간을 마쳤어요!':'판을 완성했어요!',
    description:`${board==='tally'?'칸을 늘려':board==='period'?'종료일을 늘려':'완성을 풀고'} 이 판에 계속 붙일 수 있어요. 닫으면 완성한 판으로 보관돼요.`,
    secondaryLabel:'닫기',primaryLabel:'계속하기'}),
  /** 판에서 기록 있는 칸을 꾹 눌렀을 때. */
  removeSticker:{title:'스티커를 뗄까요?',description:'이 칸의 사진·메모도 함께 사라져요.',secondaryLabel:'취소',primaryLabel:'떼기'},
  /** 기록 화면의 [스티커 떼기]. */
  removeStickerInRecord:{title:'스티커를 뗄까요?',description:'사진·메모도 함께 사라져요.',secondaryLabel:'취소',primaryLabel:'떼기'},
  /** description은 함께 지워지는 수 (pocketAdapter deleteDescription). */
  deleteGoal:(description:string)=>({title:'목표를 삭제할까요?',description,secondaryLabel:'취소',primaryLabel:'삭제하기'}),
  unsaved:{title:'저장하지 않고 나갈까요?',description:'지금 쓴 내용이 사라져요.',primaryLabel:'계속 쓰기',secondaryLabel:'나가기'},
  photoDenied:{title:'사진에 접근할 수 없어요',description:'기기 설정에서 차곡차곡의 사진 접근을 허용하면 다시 첨부할 수 있어요. 메모는 계속 남길 수 있어요.',secondaryLabel:'메모만 남기기',primaryLabel:'기기 설정 열기'},
  cameraDenied:{title:'카메라를 쓸 수 없어요',description:'기기 설정에서 차곡차곡의 카메라 접근을 허용하면 사진을 찍을 수 있어요. 앨범에서 고르거나 메모만 남길 수도 있어요.',secondaryLabel:'닫기',primaryLabel:'기기 설정 열기'},
  cameraUnavailable:{title:'카메라를 열 수 없어요',description:'앨범에서 사진을 골라 주세요. 메모는 그대로 남길 수 있어요.',primaryLabel:'확인'},
  /** 저장·붙이기·삭제 실패. title은 결과('저장하지 못했어요' 등). */
  saveFailed:(title:string)=>({title,description:'잠시 후 다시 시도해주세요. 입력한 내용은 그대로 있어요.',primaryLabel:'확인'}),
} as const;
