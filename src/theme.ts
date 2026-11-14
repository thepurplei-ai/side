// side's look: "Midnight Cinema". Deep night-blue screens, electric violet like neon cinema lights,
// cream text like an old film poster, and a serif display font for titles.
// Change colours and fonts here to restyle the whole app.
export const colors = {
  bg: '#0A0A16',
  surface: '#14142A',
  surface2: '#1D1D3A',
  border: '#2B2B52',
  text: '#F7F0E3',
  textDim: '#A7A2BF',
  /** Electric violet: main buttons, the camera shutter, highlights. */
  primary: '#7B68FF',
  primaryDim: '#221C4F',
  /** Text and icons on top of violet or family-blue buttons. */
  onPrimary: '#FFFFFF',
  /** Coral: likes and hearts. */
  accent: '#FF6B5B',
  success: '#5EE3A1',
  warning: '#FF9F6B',
  danger: '#FF7A7A',
  family: '#2E9BE6',
  /** See-through panels that sit on top of videos. */
  glass: 'rgba(10,10,22,0.72)',
  glassBorder: 'rgba(247,240,227,0.14)',
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
