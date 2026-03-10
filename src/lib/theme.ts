/**
 * Design token source of truth.
 * CSS variables (`globals.css`) are the primary reference for components.
 * Import this file only where CSS vars are unavailable — e.g. Recharts, Canvas.
 */

export const theme = {
  // Surfaces
  bg:       '#0F172A',
  surface:  '#1E293B',
  surface2: '#0F172A',
  sidebar:  '#111827',

  // Borders
  border:  '#334155',
  borderS: '#475569',

  // Text
  text:   '#E2E8F0',
  muted:  '#94A3B8',
  subtle: '#64748B',

  // Primary
  primary:     '#3B82F6',
  primaryH:    '#2563EB',
  primaryBg:   'rgba(59,130,246,0.12)',
  primaryRing: 'rgba(59,130,246,0.28)',

  // Status
  green:   '#22C55E', greenBg:  'rgba(34,197,94,0.12)',
  red:     '#EF4444', redBg:    'rgba(239,68,68,0.12)',
  amber:   '#F59E0B', amberBg:  'rgba(245,158,11,0.12)',
  gray:    '#94A3B8', grayBg:   'rgba(100,116,139,0.12)',

  // Shadows
  shadowCard:  '0 1px 2px rgba(0,0,0,0.4), 0 4px 16px rgba(0,0,0,0.25)',
  shadowModal: '0 8px 32px rgba(0,0,0,0.5), 0 32px 64px rgba(0,0,0,0.4)',

  // Radii
  radiusCard: 14,
} as const;
