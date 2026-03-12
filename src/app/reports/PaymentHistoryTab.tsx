'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, DataTable, Td, TRow, TableSkeleton } from '@/components/ui';

type PaymentRow = {
  id:          number;
  paidAt:      string;
  amount:      number;
  method:      string;
  referenceNo: string | null;
  tenantName:  string;
  property:    string;
  unit:        string;
  chargeId:    number;
  contractId:  number;
};

type PropertyOption = { id: number; title: string };
type TenantOption   = { id: number; name:  string };

const COLS = [
  { label: 'Tarih'                        },
  { label: 'Kiracı'                       },
  { label: 'Mülk / Daire'                 },
  { label: 'Yöntem'                       },
  { label: 'Tutar',      right: true      },
];

const fmt = (n: number) =>
  `₺${n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function PaymentHistoryTab() {
  const [rows,       setRows]       = useState<PaymentRow[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [from,       setFrom]       = useState('');
  const [to,         setTo]         = useState('');
  const [tenantId,   setTenantId]   = useState('');
  const [propertyId, setPropertyId] = useState('');
  const [properties, setProperties] = useState<PropertyOption[]>([]);
  const [tenants,    setTenants]    = useState<TenantOption[]>([]);

  // Load filter options once
  useEffect(() => {
    fetch('/api/properties').then(r => r.ok ? r.json() : []).then(setProperties).catch(() => {});
    fetch('/api/tenants').then(r => r.ok ? r.json() : []).then(setTenants).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const qs = new URLSearchParams();
    if (from)       qs.set('from',       from);
    if (to)         qs.set('to',         to);
    if (tenantId)   qs.set('tenantId',   tenantId);
    if (propertyId) qs.set('propertyId', propertyId);
    const res = await fetch(`/api/reports/payment-history?${qs}`);
    setRows(res.ok ? await res.json() : []);
    setLoading(false);
  }, [from, to, tenantId, propertyId]);

  useEffect(() => { load(); }, [load]);

  const total = rows.reduce((s, r) => s + r.amount, 0);

  function exportCsv() {
    const header = ['"Tarih";"Kiracı";"Mülk";"Daire";"Yöntem";"Referans";"Tutar (₺)";"Alacak No";"Sözleşme No"'].join('');
    const body   = rows.map(r =>
      `"${new Date(r.paidAt).toLocaleDateString('tr-TR')}";"${r.tenantName}";"${r.property}";"${r.unit}";"${r.method}";"${r.referenceNo ?? ''}";"${r.amount.toFixed(2)}";"${r.chargeId}";"${r.contractId}"`
    );
    const csv = '\uFEFF' + [header, ...body].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'odeme-gecmisi.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

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
        <select value={propertyId} onChange={e => setPropertyId(e.target.value)} style={{ width: 'auto', minWidth: 160 }}>
          <option value="">Tüm Binalar</option>
          {properties.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
        </select>
        <select value={tenantId} onChange={e => setTenantId(e.target.value)} style={{ width: 'auto', minWidth: 160 }}>
          <option value="">Tüm Kiracılar</option>
          {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        {(from || to || tenantId || propertyId) && (
          <button
            onClick={() => { setFrom(''); setTo(''); setTenantId(''); setPropertyId(''); }}
            style={{ fontSize: '0.8125rem', color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px' }}
          >
            Temizle
          </button>
        )}
      </div>

      {/* Summary + CSV */}
      {!loading && rows.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', gap: 20 }}>
            <span style={{ fontSize: '0.8125rem', color: 'var(--muted)' }}>
              <span style={{ fontWeight: 600, color: 'var(--text)' }}>{rows.length}</span> ödeme
            </span>
            <span style={{ fontSize: '0.8125rem', color: 'var(--muted)' }}>
              Toplam:{' '}
              <span style={{ fontFamily: 'ui-monospace, monospace', fontWeight: 700, color: 'var(--green)' }}>
                {fmt(total)}
              </span>
            </span>
          </div>
          <button
            onClick={exportCsv}
            style={{
              fontSize: '0.8125rem', fontWeight: 600, color: 'var(--primary)',
              background: 'var(--primary-bg)', border: '1px solid var(--primary-ring)',
              borderRadius: 7, padding: '5px 12px', cursor: 'pointer',
            }}
          >
            CSV İndir
          </button>
        </div>
      )}

      <Card>
        {loading ? (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody><TableSkeleton cols={5} rows={6} /></tbody>
          </table>
        ) : rows.length === 0 ? (
          <div style={{ padding: '40px 24px', textAlign: 'center' }}>
            <p style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text)', margin: '0 0 4px' }}>Ödeme bulunamadı</p>
            <p style={{ fontSize: '0.8125rem', color: 'var(--muted)', margin: 0 }}>Farklı filtre kriterleri deneyin.</p>
          </div>
        ) : (
          <DataTable cols={COLS}>
            {rows.map(r => (
              <TRow key={r.id}>
                <Td muted>{new Date(r.paidAt).toLocaleDateString('tr-TR')}</Td>
                <Td><span style={{ fontWeight: 600 }}>{r.tenantName}</span></Td>
                <Td muted>{r.property} · {r.unit}</Td>
                <Td muted>{r.method}{r.referenceNo ? ` · ${r.referenceNo}` : ''}</Td>
                <Td right>
                  <span style={{ fontFamily: 'ui-monospace, monospace', fontWeight: 700, color: 'var(--green)' }}>
                    {fmt(r.amount)}
                  </span>
                </Td>
              </TRow>
            ))}
          </DataTable>
        )}
      </Card>
    </div>
  );
}
