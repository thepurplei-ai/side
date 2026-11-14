// side's look: "Purple Silk". Dark purple silk screens with a soft sheen, electric violet buttons,
// a touch of lemon for small highlights,
// cream text like an old film poster, and a serif display font for titles.
// Change colours and fonts here to restyle the whole app.
export const colors = {
  bg: '#1A0F2E',
  surface: '#251840',
  surface2: '#2F2050',
  border: '#43316B',
  text: '#F7F0E3',
  textDim: '#B8ADD3',
  /** Electric violet: main buttons, the camera shutter, highlights. */
  primary: '#8572FF',
  primaryDim: '#33245F',
  /** Text and icons on top of violet or family-blue buttons. */
  onPrimary: '#FFFFFF',
  /** Lemon: a little touch for small highlights (section labels, progress line, "starring"). */
  lemon: '#E6F46A',
  /** Coral: likes and hearts. */
  accent: '#FF6B5B',
  success: '#5EE3A1',
  warning: '#FF9F6B',
  danger: '#FF7A7A',
  family: '#2E9BE6',
  /** See-through panels that sit on top of videos. */
  glass: 'rgba(26,15,46,0.74)',
  glassBorder: 'rgba(247,240,227,0.14)',
} as const;

/** The silk sheen: soft diagonal bands of purple behind the main screens. */
export const silk = {
  colors: ['#2B1850', '#1A0F2E', '#2A1A4C', '#160C28', '#24143F'],
  locations: [0, 0.3, 0.52, 0.78, 1],
} as const;

export const fonts = {
  /** Serif for titles and the logo. */
  display: 'Fraunces_700Bold',
  displayItalic: 'Fraunces_700Bold_Italic',
  /** Sans-serif for everything else. */
  regular: 'Manrope_500Medium',
  bold: 'Manrope_700Bold',
  heavy: 'Manrope_800ExtraBold',
} as const;

export const radius = { sm: 10, md: 16, lg: 24, pill: 999 } as const;
export const space = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 } as const;

/** Height of the floating dock (menu) at the bottom, without the phone's own bottom bar. */
export const DOCK_HEIGHT = 68;
export const DOCK_MARGIN = 12;
