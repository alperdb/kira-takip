/**
 * Design token source of truth.
 * CSS variables (`globals.css`) are the primary reference for components.
 * Import this file only where CSS vars are unavailable — e.g. Recharts, Canvas.
 */

export const theme = {
  // Surfaces
  bg:       '#0B0B0C',
  surface:  '#111113',
  surface2: '#1A1A1D',
  sidebar:  '#0D0D0F',

  // Borders
  border:  '#222226',
  borderS: '#3A3A3E',

  // Text
  text:   '#F5F5F7',
  muted:  '#8E8E93',
  subtle: '#636366',

  // Primary
  primary:     '#4F8CFF',
  primaryH:    '#3A7FFF',
  primaryBg:   'rgba(79,140,255,0.12)',
  primaryRing: 'rgba(79,140,255,0.28)',

  // Status
  green:   '#30D158', greenBg:  'rgba(48,209,88,0.12)',
  red:     '#FF453A', redBg:    'rgba(255,69,58,0.12)',
  amber:   '#FFD60A', amberBg:  'rgba(255,214,10,0.10)',
  gray:    '#8E8E93', grayBg:   'rgba(142,142,147,0.12)',

  // Shadows
  shadowCard:  '0 1px 0 rgba(255,255,255,0.04) inset, 0 1px 3px rgba(0,0,0,0.6)',
  shadowModal: '0 0 0 1px rgba(255,255,255,0.07), 0 24px 48px rgba(0,0,0,0.7)',

  // Radii
  radiusCard: 14,
} as const;
