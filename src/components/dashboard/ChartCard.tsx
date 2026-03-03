'use client';

import {
  AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { EmptyState } from '@/components/ui';
import { BarChart3 } from 'lucide-react';

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
      boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
    }}>
      <p style={{ fontWeight: 600, fontSize: '0.8125rem', marginBottom: 6, color: 'var(--text)' }}>{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ fontSize: '0.8125rem', color: p.color, margin: '2px 0' }}>
          {p.name === 'alacak' ? 'Alacak' : 'Tahsilat'}: ₺{p.value.toLocaleString('tr-TR')}
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
        title="Henüz veri yok"
        desc="Alacak oluşturuldukça grafik burada görünecek."
      />
    );
  }

  return (
    <div style={{ height: 260 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="g-alacak" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#2563EB" stopOpacity={0.14} />
              <stop offset="100%" stopColor="#2563EB" stopOpacity={0}    />
            </linearGradient>
            <linearGradient id="g-tahsilat" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#16A34A" stopOpacity={0.14} />
              <stop offset="100%" stopColor="#16A34A" stopOpacity={0}    />
            </linearGradient>
          </defs>

          <CartesianGrid stroke="#E2E8F0" strokeDasharray="0" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 12, fill: '#94A3B8' }}
            axisLine={false} tickLine={false}
          />
          <YAxis
            tickFormatter={fmtY}
            tick={{ fontSize: 12, fill: '#94A3B8' }}
            axisLine={false} tickLine={false}
            width={44}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#E2E8F0', strokeWidth: 1 }} />

          <Area
            type="monotone" dataKey="alacak" name="alacak"
            stroke="#2563EB" strokeWidth={2}
            fill="url(#g-alacak)"
            dot={false} activeDot={{ r: 4, fill: '#2563EB', strokeWidth: 0 }}
          />
          <Area
            type="monotone" dataKey="tahsilat" name="tahsilat"
            stroke="#16A34A" strokeWidth={2}
            fill="url(#g-tahsilat)"
            dot={false} activeDot={{ r: 4, fill: '#16A34A', strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
