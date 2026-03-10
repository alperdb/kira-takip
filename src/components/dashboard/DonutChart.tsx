'use client';

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { theme } from '@/lib/theme';

type Props = { gelir: number; gider: number; outstanding: number };

/** Rounds to 2 decimal percent; guards against division by zero. */
function toPct(v: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((v / total) * 10_000) / 100;
}

const fmtShort = (n: number) => {
  const a = Math.abs(n);
  if (a >= 1_000_000) return `₺${(a / 1_000_000).toFixed(1)}M`;
  if (a >= 1_000)     return `₺${(a / 1_000).toFixed(0)}K`;
  return `₺${a.toLocaleString('tr-TR')}`;
};

type TP = { active?: boolean; payload?: Array<{ name: string; value: number; payload: { raw: number } }> };
function CustomTooltip({ active, payload }: TP) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div style={{
      background: theme.surface, border: `1px solid ${theme.border}`,
      borderRadius: 10, padding: '8px 12px',
      boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
      fontSize: '0.8125rem', color: theme.muted,
    }}>
      <span style={{ fontWeight: 600, color: theme.text }}>{p.name}:</span>{' '}
      ₺{p.payload.raw.toLocaleString('tr-TR')}{' '}
      <span style={{ color: theme.subtle }}>({p.value.toFixed(2)}%)</span>
    </div>
  );
}

export function DonutChart({ gelir, gider, outstanding }: Props) {
  const noExpense = gider === 0;
  const total     = noExpense ? gelir + outstanding : gelir + gider;

  // ── Empty state ──────────────────────────────────────────────
  if (total === 0) {
    return (
      <div style={{
        height: '100%', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 4,
      }}>
        <span style={{ fontSize: '0.8125rem', color: 'var(--subtle)' }}>Veri yok</span>
      </div>
    );
  }

  // ── Normalized segment data (pct as dataKey keeps chart == legend) ──
  const data = noExpense
    ? [
        { name: 'Tahsilat', pct: toPct(gelir,       total), raw: gelir       },
        { name: 'Bekleyen', pct: toPct(outstanding,  total), raw: outstanding },
      ]
    : [
        { name: 'Gelir', pct: toPct(gelir, total), raw: gelir },
        { name: 'Gider', pct: toPct(gider, total), raw: gider },
      ];

  // Colors indexed in sync with data — no filter, no index shift
  const colors = noExpense
    ? [theme.green, theme.amber]
    : [theme.primary, theme.red];

  // ── Center overlay values ────────────────────────────────────
  const centerLabel   = noExpense ? 'Tahsilat' : 'Net';
  const centerDisplay = noExpense
    ? `${toPct(gelir, total).toFixed(2)}%`
    : (() => { const n = gelir - gider; return `${n < 0 ? '−' : ''}${fmtShort(Math.abs(n))}`; })();
  const centerColor   = noExpense
    ? theme.green
    : (gelir >= gider ? theme.green : theme.red);

  return (
    <div style={{ position: 'relative', height: '100%' }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%" cy="50%"
            innerRadius="52%" outerRadius="75%"
            dataKey="pct"
            strokeWidth={0}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={colors[i]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>

      {/* Center overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        pointerEvents: 'none',
      }}>
        <p style={{
          fontSize: '0.625rem', fontWeight: 600, color: 'var(--subtle)',
          textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0,
        }}>
          {centerLabel}
        </p>
        <p style={{
          fontSize: '0.9375rem', fontWeight: 700,
          color: centerColor, letterSpacing: '-0.02em',
          fontFamily: 'ui-monospace, monospace', margin: '3px 0 0',
        }}>
          {centerDisplay}
        </p>
      </div>
    </div>
  );
}
