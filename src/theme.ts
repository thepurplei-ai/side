// side's look: "Monochrome Studio". Pure black and white, with one red "recording" dot (logo, progress line,
// recording, likes). The clips bring the color. Serif display font for titles.
// Change colours and fonts here to restyle the whole app.
export const colors = {
  bg: '#000000',
  surface: '#111111',
  surface2: '#1B1B1B',
  border: '#2A2A2A',
  text: '#FFFFFF',
  textDim: '#9A9A9A',
  /** White: main buttons and the camera shutter. Text on them is black. */
  primary: '#FFFFFF',
  primaryDim: '#1F1F1F',
  /** Text and icons on top of white or family-blue buttons. */
  onPrimary: '#000000',
  /** The one red "recording" dot: logo dot, progress line, recording, small highlights. */
  highlight: '#FF3B30',
  /** Likes and hearts: the same red. */
  accent: '#FF3B30',
  success: '#5EE3A1',
  warning: '#FFB86B',
  danger: '#FF5A52',
  family: '#8EC5FF',
  /** See-through panels that sit on top of videos. */
  glass: 'rgba(0,0,0,0.72)',
  glassBorder: 'rgba(255,255,255,0.14)',
} as const;

/** A very soft studio light from the top, fading into pure black. */
export const backdrop = {
  colors: ['#1C1C1C', '#000000', '#0A0A0A', '#000000', '#050505'],
  locations: [0, 0.35, 0.6, 0.85, 1],
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
