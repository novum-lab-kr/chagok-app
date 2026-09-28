import type { Meta,StoryObj } from '@storybook/react-vite';
import { PixelDialog } from '../src/design-system';
const meta={title:'Components/Dialog',component:PixelDialog,args:{step:'1 / 3',title:'목표 만들기',description:'＋를 눌러 목표를 만들어요',primaryLabel:'다음',secondaryLabel:'건너뛰기'},parameters:{docs:{description:{component:'다이얼로그 표면 컴포넌트입니다. 실제 앱의 Modal 호스트가 포커스·닫기·배경 차단을 담당합니다. 여기서는 글씨, 프레임, 버튼과 콘텐츠 크기를 검토합니다.'}}}} satisfies Meta<typeof PixelDialog>;
export default meta;type Story=StoryObj<typeof meta>;
export const FirstStep:Story={};
export const StickerStep:Story={args:{step:'2 / 3',title:'스티커 고르기',description:'목표마다 스티커를 정해요'}};
export const LastStep:Story={args:{step:'3 / 3',title:'빈칸에 톡!',description:'누르면 스티커가 붙어요',primaryLabel:'시작하기'}};
