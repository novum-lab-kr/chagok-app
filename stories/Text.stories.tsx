import type { Meta, StoryObj } from '@storybook/react-vite';
import { PixelText } from '../src/design-system';
const meta={title:'Components/Text',component:PixelText,args:{children:'차곡차곡, 오늘도 한 칸. 0123456789',variant:'body'},argTypes:{variant:{control:'select',options:['brand','title','body','label','button','number','caption','badge']},children:{control:'text'},style:{control:false}}} satisfies Meta<typeof PixelText>;
export default meta;
type Story=StoryObj<typeof meta>;
export const Playground:Story={};
export const Brand:Story={args:{variant:'brand',children:'차곡차곡'}};
export const Title:Story={args:{variant:'title',children:'목표 설정'}};
export const Number:Story={args:{variant:'number',children:'6 / 15'}};
