import type {PocketStickerId} from '../stickers/pocket/catalog';

/** 위젯 화면 모델 (위젯 설계). 스냅샷(src/widgets/snapshot.ts)이 이 모양을 채운다 — GoalCardItem과 같은 방식. */
export type WidgetCalendarCell='filled'|'missed'|'future'|'outside';
export type WidgetTallyCell='filled'|'empty';
export type WidgetMini=
  |{type:'calendar';year:number;month:number;firstWeekday:number;days:WidgetCalendarCell[]}
  |{type:'tally';from:number;cells:WidgetTallyCell[];placed:number;total:number};
export type WidgetGoalView={id:string;name:string;sticker:PocketStickerId;kind:string;progressLabel:string;percent:number;mini:WidgetMini};
