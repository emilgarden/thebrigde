/**
 * OpenBridge fire paletter — hue for alarm/warning/nominal er semantisk
 * fast på tvers av alle paletter (CURSOR.md punkt 23).
 *
 * Kilde: docs/bridge-ux-v7.html linje 10–13.
 */

export type PaletteName = 'night' | 'dusk' | 'day' | 'bright';
export type PaletteMode = 'auto' | PaletteName;

export interface PaletteColors {
  bg: string;
  surface: string;
  border: string;
  borderLo: string;
  text: string;
  sub: string;
  dim: string;
  active: string;
  nominal: string;
  warning: string;
  alarm: string;
  bearingBg: string;
}

export const PALETTES: Record<PaletteName, PaletteColors> = {
  night: {
    bg: '#0a0d14',
    surface: '#0f1420',
    border: '#18222e',
    borderLo: '#101820',
    text: '#8aa0b8',
    sub: '#2e3f52',
    dim: '#18242e',
    active: '#2468a8',
    nominal: '#186040',
    warning: '#906010',
    alarm: '#901818',
    bearingBg: '#090c13',
  },
  dusk: {
    bg: '#0d1420',
    surface: '#131c2c',
    border: '#1e2d40',
    borderLo: '#141e2c',
    text: '#a8bcd4',
    sub: '#3c5068',
    dim: '#1c2a3c',
    active: '#2e78cc',
    nominal: '#1e7850',
    warning: '#b07020',
    alarm: '#b02020',
    bearingBg: '#0b1018',
  },
  day: {
    bg: '#0f1622',
    surface: '#171e2e',
    border: '#222e42',
    borderLo: '#161e2e',
    text: '#ccd8ec',
    sub: '#4a6080',
    dim: '#1e2c40',
    active: '#3888e8',
    nominal: '#259060',
    warning: '#d08820',
    alarm: '#d83030',
    bearingBg: '#0d121c',
  },
  bright: {
    bg: '#141c2a',
    surface: '#1c2638',
    border: '#2a3a52',
    borderLo: '#1a2438',
    text: '#e0ecf8',
    sub: '#6080a0',
    dim: '#243248',
    active: '#4898f8',
    nominal: '#28a870',
    warning: '#e09030',
    alarm: '#e83838',
    bearingBg: '#111820',
  },
};

export function paletteFromHour(h: number): PaletteName {
  if (h >= 11 && h < 15) return 'bright';
  if ((h >= 8 && h < 11) || (h >= 15 && h < 18)) return 'day';
  if ((h >= 6 && h < 8) || (h >= 18 && h < 20)) return 'dusk';
  return 'night';
}
