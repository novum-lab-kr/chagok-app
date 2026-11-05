import React from 'react';
import type { Preview } from '@storybook/react-vite';
import { InlineModalContext, retro } from '../src/design-system';
import { setLanguage, type Language } from '../src/i18n';
import './preview.css';

const preview: Preview = {
  tags: ['autodocs'],
  // 툴바에서 앱 문구 언어를 바꾼다. 앱의 기본값(기기 언어)과 달리 여기서는 눈으로 고른다.
  globalTypes: { language: { description: '앱 문구 언어', toolbar: { title: '언어', icon: 'globe', items: [{value:'ko',title:'한국어'},{value:'en',title:'English'}], dynamicTitle: true } } },
  initialGlobals: { language: 'ko' },
  loaders: [async () => {
    await document.fonts.load('16px NeoDunggeunmo', '차곡차곡 책 읽기 기본 스티커');
    if (!document.fonts.check('16px NeoDunggeunmo')) throw new Error('Neo둥근모 폰트를 불러오지 못했습니다.');
    return { fontLoaded: true };
  }],
  // 문서 페이지와 흐름도에서는 시트와 다이얼로그를 그 화면 안에 그린다. Modal은 페이지 전체를 덮어, 흐름도 노드마다 시트가 올라왔다(2026-11-04).
  decorators: [(Story, context) => { setLanguage(context.globals.language as Language); const inline = context.viewMode === 'docs'; return <InlineModalContext.Provider value={inline}><div style={{padding:context.parameters.edgeToEdge ? 0 : 24, background:retro.color.screen, minHeight:'100vh', boxSizing:'border-box'}}><Story /></div></InlineModalContext.Provider>; }],
  parameters: {
    layout: 'fullscreen',
    controls: { expanded: true },
    options: { storySort: { order: ['Design System', 'Foundations', 'Components', 'Compositions'] } },
    docs: { codePanel: true },
    backgrounds: { options: { mint: {name:'Viewport',value:retro.color.screen}, lcd:{name:'LCD',value:retro.color.lcd}, ivory:{name:'Dialog',value:retro.color.dialog} } },
  },
};
export default preview;
