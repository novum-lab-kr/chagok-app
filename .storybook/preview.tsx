import React from 'react';
import type { Preview } from '@storybook/react-vite';
import { retro } from '../src/design-system';
import './preview.css';

const preview: Preview = {
  tags: ['autodocs'],
  loaders: [async () => {
    await document.fonts.load('16px NeoDunggeunmo', '차곡차곡 책 읽기 기본 스티커');
    if (!document.fonts.check('16px NeoDunggeunmo')) throw new Error('Neo둥근모 폰트를 불러오지 못했습니다.');
    return { fontLoaded: true };
  }],
  decorators: [(Story, context) => <div style={{padding:context.parameters.edgeToEdge ? 0 : 24, background:retro.color.screen, minHeight:'100vh', boxSizing:'border-box'}}><Story /></div>],
  parameters: {
    layout: 'fullscreen',
    controls: { expanded: true },
    options: { storySort: { order: ['Design System', 'Foundations', 'Components', 'Compositions'] } },
    docs: { codePanel: true },
    backgrounds: { options: { mint: {name:'Viewport',value:retro.color.screen}, lcd:{name:'LCD',value:retro.color.lcd}, ivory:{name:'Dialog',value:retro.color.dialog} } },
  },
};
export default preview;
