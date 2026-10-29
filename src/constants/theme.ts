/**
 * "Neon Pulse" design system, taken from the EventSpot Stitch project.
 * Dark is the primary experience; light mirrors the Stitch "Light Mode" screens.
 */

import { Platform } from 'react-native';

const dark = {
  background: '#0e0e13',
  surface: '#131318',
  surfaceLow: '#1b1b20',
  surfaceContainer: '#1f1f25',
  surfaceHigh: '#2a292f',
  surfaceHighest: '#35343a',
  glass: 'rgba(20, 20, 25, 0.72)',
  primary: '#e9b3ff',
  primaryContainer: '#c863fb',
  onPrimary: '#510074',
  onPrimaryContainer: '#460066',
  secondary: '#a2e7ff',
  tertiary: '#ffb2b7',
  live: '#ff5449',
  text: '#e4e1e9',
  textSecondary: '#d2c1d4',
  textMuted: '#8a8291',
  outline: '#9b8c9e',
  outlineVariant: '#4f4352',
  error: '#ffb4ab',
  // BIBING brand gradient (mascot / logo): magenta → cyan.
  brandStart: '#E94FFC',
  brandEnd: '#5CE8FB',
  overlay: 'rgba(14, 14, 19, 0.85)',
};

export type Palette = typeof dark;

const light: Palette = {
  background: '#ffffff',
  surface: '#f6f6fb',
  surfaceLow: '#f0f0f6',
  surfaceContainer: '#e7e8ee',
  surfaceHigh: '#e1e2e8',
  surfaceHighest: '#dbdde3',
  glass: 'rgba(255, 255, 255, 0.85)',
  primary: '#683ad1',
  primaryContainer: '#ac8eff',
  onPrimary: '#f7f0ff',
  onPrimaryContainer: '#2a0070',
  secondary: '#7343a9',
  tertiary: '#b0222a',
  live: '#b41340',
  text: '#2d2f33',
  textSecondary: '#5a5b60',
  textMuted: '#75777b',
  outline: '#75777b',
  outlineVariant: '#acadb1',
  error: '#b41340',
  // BIBING violet reads better than magenta on white.
  brandStart: '#8044FB',
  brandEnd: '#C34BEA',
  overlay: 'rgba(255, 255, 255, 0.9)',
};

export const Colors = { dark, light } as const;

export const Fonts = {
  headline: 'Epilogue_800ExtraBold',
  headlineBlack: 'Epilogue_900Black',
  headlineBold: 'Epilogue_700Bold',
  body: 'Manrope_500Medium',
  bodyRegular: 'Manrope_400Regular',
  bodyBold: 'Manrope_700Bold',
  bodyExtraBold: 'Manrope_800ExtraBold',
};

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = {
  sm: 12,
  md: 24,
  lg: 32,
  full: 999,
} as const;

/** Height of the floating glass tab bar, used to pad scroll content. */
export const TabBarHeight = Platform.select({ ios: 88, default: 76 });
export const MaxContentWidth = 640;
