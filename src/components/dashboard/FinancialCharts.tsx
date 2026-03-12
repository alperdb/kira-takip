'use client';

import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { Card } from '@/components/ui';
import { theme } from '@/lib/theme';

type Summary = {
  revenueByBuilding: { title: string; paid: number }[];
  overdueByBuilding: { title: string; count: number; overdue: number }[];
};

const fmtY = (v: number) =>
  v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M`
  : v >= 1_000   ? `${(v / 1_000).toFixed(0)}K`
  : String(v);

const fmtTL = (v: number) =>
  `₺${v.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function RevenueTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: theme.surface, border: `1px solid ${theme.border}`,
      borderRadius: 10, padding: '10px 14px',
      boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
    }}>
      <p style={{ fontWeight: 600, fontSize: '0.8125rem', marginBottom: 4, color: theme.text }}>{label}</p>
      <p style={{ fontSize: '0.8125rem', color: theme.green, margin: 0 }}>
        Tahsilat: {fmtTL(payload[0].value)}
      </p>
    </div>
  );
}

function OverdueTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: theme.surface, border: `1px solid ${theme.border}`,
      borderRadius: 10, padding: '10px 14px',
      boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
    }}>
      <p style={{ fontWeight: 600, fontSize: '0.8125rem', marginBottom: 4, color: theme.text }}>{label}</p>
      <p style={{ fontSize: '0.8125rem', color: theme.red, margin: 0 }}>
        Gecikme: {fmtTL(payload[0].value)}
      </p>
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div style={{
      height: 240,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <span style={{ fontSize: '0.8125rem', color: 'var(--subtle)' }}>Yükleniyor...</span>
    </div>
  );
}

function EmptyChart({ msg }: { msg: string }) {
  return (
    <div style={{
      height: 240,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <span style={{ fontSize: '0.8125rem', color: 'var(--subtle)' }}>{msg}</span>
    </div>
  );
}

export function FinancialCharts() {
  const [data,    setData]    = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard/financial-summary')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const hasRevenue = !loading && !!data && data.revenueByBuilding.some(r => r.paid > 0);
  const hasOverdue = !loading && !!data && data.overdueByBuilding.length > 0;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>

      {/* ── Income by Property ── */}
      <Card>
        <div style={{ padding: '20px 24px 0' }}>
          <p style={{ fontWeight: 600, fontSize: '0.9375rem', margin: '0 0 2px', color: 'var(--text)' }}>
            Binaya Göre Gelir
          </p>
          <p style={{ fontSize: '0.8125rem', color: 'var(--muted)', margin: 0 }}>Toplam tahsilat</p>
        </div>
        <div style={{ padding: '16px 16px 20px' }}>
          {loading ? (
            <ChartSkeleton />
          ) : !hasRevenue ? (
            <EmptyChart msg="Henüz tahsilat kaydı yok" />
          ) : (
            <div style={{ height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data!.revenueByBuilding} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke={theme.border} strokeDasharray="0" vertical={false} />
                  <XAxis
                    dataKey="title"
                    tick={{ fontSize: 11, fill: theme.subtle }}
                    axisLine={false} tickLine={false}
                  />
                  <YAxis
                    tickFormatter={fmtY}
                    tick={{ fontSize: 11, fill: theme.subtle }}
                    axisLine={false} tickLine={false}
                    width={44}
                  />
                  <Tooltip content={<RevenueTooltip />} cursor={{ fill: theme.surface2 }} />
                  <Bar dataKey="paid" radius={[4, 4, 0, 0]}>
                    {data!.revenueByBuilding.map((_, i) => (
                      <Cell key={i} fill={theme.green} fillOpacity={1 - i * 0.07} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </Card>

      {/* ── Overdue by Property ── */}
      <Card>
        <div style={{ padding: '20px 24px 0' }}>
          <p style={{ fontWeight: 600, fontSize: '0.9375rem', margin: '0 0 2px', color: 'var(--text)' }}>
            Geciken Alacaklar
          </p>
          <p style={{ fontSize: '0.8125rem', color: 'var(--muted)', margin: 0 }}>Binaya göre gecikme miktarı</p>
        </div>
        <div style={{ padding: '16px 16px 20px' }}>
          {loading ? (
            <ChartSkeleton />
          ) : !hasOverdue ? (
            <EmptyChart msg="Geciken alacak yok" />
          ) : (
            <div style={{ height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data!.overdueByBuilding} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke={theme.border} strokeDasharray="0" vertical={false} />
                  <XAxis
                    dataKey="title"
                    tick={{ fontSize: 11, fill: theme.subtle }}
                    axisLine={false} tickLine={false}
                  />
                  <YAxis
                    tickFormatter={fmtY}
                    tick={{ fontSize: 11, fill: theme.subtle }}
                    axisLine={false} tickLine={false}
                    width={44}
                  />
                  <Tooltip content={<OverdueTooltip />} cursor={{ fill: theme.surface2 }} />
                  <Bar dataKey="overdue" radius={[4, 4, 0, 0]} fill={theme.red} fillOpacity={0.85} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </Card>

    </div>
  );
}
