export const tokens = {
  color: {
    paper: '#F5F3EE',
    ink: '#2A2622',
    inkSoft: '#7A736B',
    slotEmpty: '#E7E3DA',
    slotLine: '#D6D1C6',
    accent: '#B5372B',
  },
  sticker: {
    stamp: '#B5372B',
    star: '#E0A32E',
    heart: '#D4645F',
    flower: '#6D9A8B',
    dot: '#8D7AB0',
  },
  space: (n: number) => n * 4,
  radius: { sticker: 999, card: 12 },
  font: { title: 20, body: 15, caption: 12 },
} as const;
