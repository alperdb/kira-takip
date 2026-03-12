'use client';

import Link from 'next/link';
import {
  AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { EmptyState } from '@/components/ui';
import { BarChart3 } from 'lucide-react';
import { theme } from '@/lib/theme';

export type MonthlyPoint = { month: string; alacak: number; tahsilat: number };

function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 10, padding: '10px 14px',
      boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
    }}>
      <p style={{ fontWeight: 600, fontSize: '0.8125rem', marginBottom: 6, color: 'var(--text)' }}>{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ fontSize: '0.8125rem', color: p.color, margin: '2px 0' }}>
          {p.name === 'alacak' ? 'Alacak' : 'Tahsilat'}: ₺{p.value.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
      ))}
    </div>
  );
}

const fmtY = (v: number) =>
  v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M`
  : v >= 1_000   ? `${(v / 1_000).toFixed(0)}K`
  : String(v);

export function ChartCard({ data }: { data: MonthlyPoint[] }) {
  if (data.length === 0) {
    return (
      <EmptyState
        icon={BarChart3}
        title="Henüz alacak verisi yok"
        desc="Aktif sözleşmeler için alacak oluşturulduğunda grafik burada görünecek."
        action={<Link href="/charges" style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--primary)', textDecoration: 'none' }}>Alacaklara Git →</Link>}
      />
    );
  }

  return (
    <div style={{ height: '100%', minHeight: 220 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={theme.border} strokeDasharray="0" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 12, fill: theme.subtle }}
            axisLine={false} tickLine={false}
          />
          <YAxis
            tickFormatter={fmtY}
            tick={{ fontSize: 12, fill: theme.subtle }}
            axisLine={false} tickLine={false}
            width={44}
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ stroke: theme.border, strokeWidth: 1 }}
          />

          {/* Color 1: primary blue */}
          <Area
            type="monotone" dataKey="alacak" name="alacak"
            stroke={theme.primary} strokeWidth={2}
            fill={theme.primary} fillOpacity={0.08}
            dot={false} activeDot={{ r: 4, fill: theme.primary, strokeWidth: 0 }}
          />

          {/* Color 2: green */}
          <Area
            type="monotone" dataKey="tahsilat" name="tahsilat"
            stroke={theme.green} strokeWidth={2}
            fill={theme.green} fillOpacity={0.08}
            dot={false} activeDot={{ r: 4, fill: theme.green, strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
