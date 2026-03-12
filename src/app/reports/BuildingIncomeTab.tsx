'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, DataTable, Td, TRow, TableSkeleton } from '@/components/ui';

type BuildingRow = {
  id:             number;
  title:          string;
  totalCharged:   number;
  totalPaid:      number;
  overdueAmount:  number;
  overdueCount:   number;
  collectionRate: number;
};

const COLS = [
  { label: 'Bina / Mülk'              },
  { label: 'Alacak',     right: true  },
  { label: 'Tahsilat',   right: true  },
  { label: 'Gecikme',    right: true  },
  { label: 'Tahsilat %', right: true  },
];

const fmt = (n: number) =>
  `₺${n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function RateBar({ rate }: { rate: number }) {
  const color = rate >= 80 ? 'var(--green)' : rate >= 50 ? 'var(--amber)' : 'var(--red)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
      <div style={{ width: 60, height: 5, borderRadius: 3, background: 'var(--surface2)', overflow: 'hidden' }}>
        <div style={{ width: `${rate}%`, height: '100%', background: color, borderRadius: 3 }} />
      </div>
      <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.8125rem', color, fontWeight: 600, minWidth: 36, textAlign: 'right' }}>
        %{rate}
      </span>
    </div>
  );
}

export function BuildingIncomeTab() {
  const [rows,    setRows]    = useState<BuildingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [from,    setFrom]    = useState('');
  const [to,      setTo]      = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const qs = new URLSearchParams();
    if (from) qs.set('from', from);
    if (to)   qs.set('to', to);
    const res = await fetch(`/api/reports/building-income?${qs}`);
    setRows(res.ok ? await res.json() : []);
    setLoading(false);
  }, [from, to]);

  useEffect(() => { load(); }, [load]);

  const totals = rows.reduce(
    (a, r) => ({ charged: a.charged + r.totalCharged, paid: a.paid + r.totalPaid, overdue: a.overdue + r.overdueAmount }),
    { charged: 0, paid: 0, overdue: 0 }
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
          <span style={{ fontSize: '0.8125rem', color: 'var(--muted)', fontWeight: 500, whiteSpace: 'nowrap' }}>Başlangıç</span>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} style={{ width: 160 }} />
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
          <span style={{ fontSize: '0.8125rem', color: 'var(--muted)', fontWeight: 500, whiteSpace: 'nowrap' }}>Bitiş</span>
          <input type="date" value={to} onChange={e => setTo(e.target.value)} style={{ width: 160 }} />
        </label>
        {(from || to) && (
          <button
            onClick={() => { setFrom(''); setTo(''); }}
            style={{ fontSize: '0.8125rem', color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px' }}
          >
            Temizle
          </button>
        )}
      </div>

      {/* KPI strip */}
      {!loading && rows.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {[
            { label: 'Toplam Alacak', value: fmt(totals.charged), color: 'var(--text)' },
            { label: 'Toplam Tahsilat', value: fmt(totals.paid), color: 'var(--green)' },
            { label: 'Toplam Gecikme', value: fmt(totals.overdue), color: totals.overdue > 0 ? 'var(--red)' : 'var(--text)' },
          ].map(item => (
            <Card key={item.label} style={{ padding: '14px 18px' }}>
              <p style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 6px' }}>
                {item.label}
              </p>
              <p style={{ fontSize: '1.125rem', fontWeight: 700, color: item.color, fontFamily: 'ui-monospace, monospace', margin: 0 }}>
                {item.value}
              </p>
            </Card>
          ))}
        </div>
      )}

      <Card>
        {loading ? (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody><TableSkeleton cols={5} rows={5} /></tbody>
          </table>
        ) : rows.length === 0 ? (
          <div style={{ padding: '40px 24px', textAlign: 'center' }}>
            <p style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text)', margin: '0 0 4px' }}>Veri yok</p>
            <p style={{ fontSize: '0.8125rem', color: 'var(--muted)', margin: 0 }}>Seçili aralık için kayıt bulunamadı.</p>
          </div>
        ) : (
          <DataTable cols={COLS}>
            {rows.map(r => (
              <TRow key={r.id}>
                <Td><span style={{ fontWeight: 600 }}>{r.title}</span></Td>
                <Td right><span style={{ fontFamily: 'ui-monospace, monospace' }}>{fmt(r.totalCharged)}</span></Td>
                <Td right><span style={{ fontFamily: 'ui-monospace, monospace', color: 'var(--green)', fontWeight: 600 }}>{fmt(r.totalPaid)}</span></Td>
                <Td right>
                  {r.overdueAmount > 0
                    ? <span style={{ fontFamily: 'ui-monospace, monospace', color: 'var(--red)', fontWeight: 600 }}>{fmt(r.overdueAmount)}</span>
                    : <span style={{ color: 'var(--subtle)' }}>—</span>}
                </Td>
                <Td right><RateBar rate={r.collectionRate} /></Td>
              </TRow>
            ))}
          </DataTable>
        )}
      </Card>
    </div>
  );
}
