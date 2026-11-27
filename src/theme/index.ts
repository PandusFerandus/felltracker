// Farben, Schrift und Maße für die ganze App (siehe CLAUDE.md, Abschnitt 4).

export const colors = {
  background: '#F0F6EF',
  text: '#1C2E22',
  textMuted: '#4F6356',
  primary: '#2F6B45',
  surfaceLight: '#DAEBDC',
  border: '#B5CCB9',
  card: '#FFFFFF',
  onPrimary: '#FFFFFF',
} as const;

export const categoryColors = {
  events: '#1F5C99',
  skin: '#B26B00',
  digestion: '#6A4590',
  joints: '#B03A7A',
} as const;

export const fonts = {
  medium: 'Nunito_500Medium',
  bold: 'Nunito_700Bold',
  extraBold: 'Nunito_800ExtraBold',
} as const;

export const radius = {
  button: 32,
  card: 20,
  small: 16,
} as const;

/** Kleinste Tippfläche in Pixeln. */
export const minTouch = 44;
