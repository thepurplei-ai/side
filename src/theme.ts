// side's look: "Deep Ocean". Deep sea-blue screens, aquamarine buttons, a warm coral touch for small
// highlights, off-white text, and a serif display font for titles.
// Change colours and fonts here to restyle the whole app.
export const colors = {
  bg: '#07161B',
  surface: '#0D242B',
  surface2: '#13313A',
  border: '#1E4550',
  text: '#EAF6F4',
  textDim: '#9DBBBD',
  /** Aquamarine: main buttons, the camera shutter, highlights. */
  primary: '#2DE1C2',
  primaryDim: '#0E3B37',
  /** Text and icons on top of aquamarine or family-blue buttons. */
  onPrimary: '#032622',
  /** Coral: a small warm touch (section labels, progress line, "starring"). */
  highlight: '#FF9A7A',
  /** Rose: likes and hearts. */
  accent: '#FF5D73',
  success: '#5EE3A1',
  warning: '#FFB86B',
  danger: '#FF7A7A',
  family: '#7AB8FF',
  /** See-through panels that sit on top of videos. */
  glass: 'rgba(7,22,27,0.76)',
  glassBorder: 'rgba(234,246,244,0.14)',
} as const;

/** The deep-ocean backdrop: light from above fading into deep water, with soft bands. */
export const backdrop = {
  colors: ['#0E3540', '#07161B', '#0A2630', '#051015', '#0A222A'],
  locations: [0, 0.32, 0.55, 0.8, 1],
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
