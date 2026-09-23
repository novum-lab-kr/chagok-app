import source from '../../docs/design/retro-pocket-v1/system/tokens.json';

// The documented contract is the only source of palette values.
const primitive = source.primitive.color;
export const retro = {
  version: source.$extensions.chagok.version,
  color: {
    screen: primitive.mint.$value,
    lcd: primitive.lcd.$value,
    ink: primitive.ink.$value,
    buttonText: primitive.buttonInk.$value,
    primary: primitive.apricot.$value,
    secondary: primitive.ivory.$value,
    dialog: primitive.ivory.$value,
    transparent: 'transparent',
  },
  fontFamily: source.font.family.$value,
  typography: Object.fromEntries(Object.entries(source.type).map(([name, value]) => [name, {
    fontSize: value.size.$value.value,
    lineHeight: value.lineHeight.$value.value,
  }])) as Record<'brand' | 'title' | 'body' | 'label' | 'button' | 'number' | 'slotNumber', {fontSize: number; lineHeight: number}>,
  space: Object.fromEntries(Object.entries(source.space).map(([key, value]) => [key, value.$value.value])) as Record<string, number>,
  shape: {
    unit: source.shape.pixelUnit.$value.value,
    panelUnit: source.shape.panelPixelUnit.$value.value,
    controlUnit: source.shape.controlPixelUnit.$value.value,
    panelInnerInset: source.shape.panelInnerInset.$value.value,
    border: source.shape.border.$value.value,
    panelBorder: source.shape.panelBorder.$value.value,
    cellBorder: source.shape.cellBorder.$value.value,
    panelTitleBorder: source.shape.panelTitleBorder.$value.value,
    shadow: source.shape.shadowOffset.$value.value,
    pressed: source.shape.pressedOffset.$value.value,
  },
  focus: {
    cornerSize: source.focus.cornerSize.$value.value,
    cornerThickness: source.focus.cornerThickness.$value.value,
    cornerCut: source.focus.cornerCut.$value.value,
    lineWidth: source.focus.lineWidth.$value.value,
    lineInset: source.focus.lineInset.$value.value,
    gap: source.focus.gap.$value.value,
  },
  opacity: {
    disabled: source.opacity.disabled.$value,
    scrim: source.opacity.scrim.$value,
    track: source.opacity.track.$value,
  },
  layout: {
    boardInset: source.layout.boardInset.$value.value,
    boardGap: source.layout.boardGap.$value.value,
    boardRowGap: source.layout.boardRowGap.$value.value,
    stickerSize: source.layout.stickerSize.$value.value,
    stickerBottomInset: source.layout.stickerBottomInset.$value.value,
    progressGridGap: source.layout.progressGridGap.$value.value,
    stickerPreviewSize: source.layout.stickerPreviewSize.$value.value,
    controlHeight: source.layout.controlHeight.$value.value,
    panelPadding: source.layout.panelPadding.$value.value,
    dialogPadding: source.layout.dialogPadding.$value.value,
    touch: source.layout.minTouch.$value.value,
  },
} as const;
export type TextVariant = keyof typeof retro.typography;
