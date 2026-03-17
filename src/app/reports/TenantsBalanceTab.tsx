'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, DataTable, Td, TRow, TableSkeleton, Badge } from '@/components/ui';

type TenantRow = {
  id:              number;
  name:            string;
  totalCharged:    number;
  totalPaid:       number;
  balance:         number;
  hasOverdue:      boolean;
  reliabilityRate: number;
};

const COLS = [
  { label: 'Kiracı'                                  },   // flexible
  { label: 'Toplam Alacak', right: true,  w: 128    },
  { label: 'Ödenen',        right: true,  w: 110    },
  { label: 'Kalan Borç',    right: true,  w: 110    },
  { label: 'Güvenilirlik',  right: false, w: 120    },
  { label: 'Durum',         right: false, w: 88     },
];

const fmt = (n: number) =>
  `₺${n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function TenantsBalanceTab() {
  const [rows,    setRows]    = useState<TenantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [status,  setStatus]  = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    const qs = new URLSearchParams({ status });
    if (search) qs.set('search', search);
    const res = await fetch(`/api/reports/tenants-balance?${qs}`);
    setRows(res.ok ? await res.json() : []);
    setLoading(false);
  }, [search, status]);

  useEffect(() => {
    const t = setTimeout(() => load(), search ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  const totals = rows.reduce(
    (a, r) => ({ charged: a.charged + r.totalCharged, paid: a.paid + r.totalPaid, balance: a.balance + r.balance }),
    { charged: 0, paid: 0, balance: 0 }
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          type="search"
          placeholder="Kiracı ara..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: 200 }}
        />
        <select value={status} onChange={e => setStatus(e.target.value)} style={{ width: 'auto', minWidth: 160 }}>
          <option value="all">Tüm Kiracılar</option>
          <option value="overdue">Gecikmeli</option>
          <option value="balance">Bakiyeli</option>
        </select>
      </div>

      {/* KPI strip */}
      {!loading && rows.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {[
            { label: 'Toplam Alacak', value: fmt(totals.charged),                           color: 'var(--text)' },
            { label: 'Toplam Ödenen', value: fmt(totals.paid),                              color: 'var(--green)' },
            { label: 'Toplam Borç',   value: fmt(totals.balance), color: totals.balance > 0 ? 'var(--red)' : 'var(--green)' },
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
            <p style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text)', margin: '0 0 4px' }}>Kiracı bulunamadı</p>
            <p style={{ fontSize: '0.8125rem', color: 'var(--muted)', margin: 0 }}>Arama kriterlerini değiştirin.</p>
          </div>
        ) : (
          <DataTable cols={COLS}>
            {rows.map(r => (
              <TRow key={r.id}>
                <Td truncate><span style={{ fontWeight: 600 }}>{r.name}</span></Td>
                <Td right><span style={{ fontFamily: 'ui-monospace, monospace' }}>{fmt(r.totalCharged)}</span></Td>
                <Td right><span style={{ fontFamily: 'ui-monospace, monospace', color: 'var(--green)', fontWeight: 600 }}>{fmt(r.totalPaid)}</span></Td>
                <Td right>
                  {r.balance > 0.01
                    ? <span style={{ fontFamily: 'ui-monospace, monospace', color: 'var(--red)', fontWeight: 700 }}>{fmt(r.balance)}</span>
                    : <span style={{ color: 'var(--subtle)' }}>—</span>}
                </Td>
                <Td>
                  <ReliabilityBar rate={r.reliabilityRate} />
                </Td>
                <Td>
                  <Badge status={r.hasOverdue ? 'overdue' : r.balance > 0.01 ? 'partial' : 'paid'} />
                </Td>
              </TRow>
            ))}
          </DataTable>
        )}
      </Card>
    </div>
  );
}

function ReliabilityBar({ rate }: { rate: number }) {
  const color = rate >= 90 ? 'var(--green)' : rate >= 70 ? 'var(--amber)' : 'var(--red)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{
        width: 60, height: 5, borderRadius: 3,
        background: 'var(--surface2)', overflow: 'hidden', flexShrink: 0,
      }}>
        <div style={{
          width: `${rate}%`, height: '100%',
          background: color, borderRadius: 3,
          transition: 'width 0.3s',
        }} />
      </div>
      <span style={{
        fontSize: '0.75rem', fontWeight: 700,
        color, fontFamily: 'ui-monospace, monospace',
        minWidth: 32,
      }}>
        %{rate}
      </span>
    </div>
  );
}
