'use client';

import { useState, useEffect, useCallback } from 'react';
import { Download, CreditCard, Trash2 } from 'lucide-react';
import {
  Card, PageHeader, DataTable, Td, TRow,
  Badge, Money, Btn, EmptyState, TableSkeleton,
  toast,
} from '@/components/ui';
import { month, date } from '@/lib/format';

type Payment = {
  id: number;
  amount: string;
  method: string;
  paidAt: string;
  referenceNo: string | null;
  notes: string | null;
  createdAt: string;
  rentCharge: {
    periodStart: string;
    periodEnd: string;
    tenant: { name: string };
    unit: { unitNo: string; property: { title: string } };
    contract: { id: number };
  };
};

const METHOD_LABELS: Record<string, string> = {
  bank:  'Banka',
  cash:  'Nakit',
  eft:   'EFT',
  check: 'Çek',
  other: 'Diğer',
};

const COLS = [
  { label: 'Kiracı'                              },   // flexible — takes remaining space
  { label: 'Bina / Daire',    w: 180             },
  { label: 'Dönem',           w: 80              },
  { label: 'Ödeme Tarihi',    w: 96              },
  { label: 'Tutar',           right: true, w: 112 },
  { label: 'Yöntem',          w: 84              },
  { label: 'Referans',        w: 116             },
  { label: '',                w: 60              },
];

export default function PaymentsPage() {
  const [payments,   setPayments]   = useState<Payment[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [method,     setMethod]     = useState('');
  const [confirmId,  setConfirmId]  = useState<number | null>(null);
  const [deleting,   setDeleting]   = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/payments');
    if (res.ok) setPayments(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = payments.filter(p => {
    const q = search.toLowerCase();
    const matchSearch = !q
      || p.rentCharge.tenant.name.toLowerCase().includes(q)
      || p.rentCharge.unit.property.title.toLowerCase().includes(q)
      || p.rentCharge.unit.unitNo.toLowerCase().includes(q)
      || (p.referenceNo ?? '').toLowerCase().includes(q);
    const matchMethod = !method || p.method === method;
    return matchSearch && matchMethod;
  });

  const totalAmount = filtered.reduce((s, p) => s + Number(p.amount), 0);

  async function downloadCsv() {
    try {
      const res = await fetch('/api/export/payments');
      if (!res.ok) throw new Error('İndirme başarısız');
      const blob     = await res.blob();
      const filename = res.headers.get('Content-Disposition')?.match(/filename="(.+)"/)?.[1] ?? 'odemeler.csv';
      const url      = URL.createObjectURL(blob);
      const a        = document.createElement('a');
      a.href         = url;
      a.download     = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: unknown) {
      toast.error((e as Error).message);
    }
  }

  async function confirmDelete(id: number) {
    setDeleting(true);
    try {
      const res = await fetch(`/api/payments/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Ödeme silindi');
        setConfirmId(null);
        load();
      } else {
        const d = await res.json();
        toast.error(d.error ?? 'Silinemedi');
        setConfirmId(null);
      }
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Ödemeler"
        desc={`${payments.length} kayıt`}
        action={
          <Btn variant="outline" onClick={downloadCsv}>
            <Download size={14} strokeWidth={2} style={{ marginRight: 6 }} />
            CSV İndir
          </Btn>
        }
      />

      {/* Summary card */}
      <div style={{ display: 'flex', gap: 12 }}>
        <Card style={{ flex: 1, padding: '16px 20px' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 500, marginBottom: 4 }}>
            Toplam Tahsilat (filtreli)
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text)' }}>
            <Money amount={totalAmount} />
          </div>
        </Card>
        <Card style={{ flex: 1, padding: '16px 20px' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 500, marginBottom: 4 }}>
            Ödeme Sayısı
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text)' }}>
            {filtered.length}
          </div>
        </Card>
      </div>

      <Card>
        {/* Filters */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input
            type="search"
            placeholder="Kiracı, bina veya referans ara..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex: '1 1 220px', minWidth: 180 }}
          />
          <select value={method} onChange={e => setMethod(e.target.value)} style={{ width: 140 }}>
            <option value="">Tüm yöntemler</option>
            {Object.entries(METHOD_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <TableSkeleton cols={COLS.length} rows={8} />
        ) : filtered.length === 0 ? (
          <EmptyState icon={CreditCard} title="Ödeme bulunamadı" />
        ) : (
          <DataTable cols={COLS}>
            {filtered.map(p => {
              const hoursSince = (Date.now() - new Date(p.createdAt).getTime()) / 3600000;
              const canDelete  = hoursSince <= 24;
              return (
                <TRow key={p.id}>
                  <Td truncate>{p.rentCharge.tenant.name}</Td>
                  <Td>
                    <div style={{ fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.rentCharge.unit.property.title}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Daire {p.rentCharge.unit.unitNo}</div>
                  </Td>
                  <Td>{month(p.rentCharge.periodStart)}</Td>
                  <Td>{date(p.paidAt)}</Td>
                  <Td right><Money amount={Number(p.amount)} /></Td>
                  <Td>
                    <Badge variant={
                      p.method === 'bank'  ? 'info'    :
                      p.method === 'cash'  ? 'success' :
                      p.method === 'eft'   ? 'info'    : 'neutral'
                    }>
                      {METHOD_LABELS[p.method] ?? p.method}
                    </Badge>
                  </Td>
                  <Td truncate muted>
                    {p.referenceNo ?? '—'}
                  </Td>
                  <Td right>
                    {canDelete && (
                      confirmId === p.id ? (
                        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                          <button
                            onClick={() => confirmDelete(p.id)}
                            disabled={deleting}
                            style={{
                              padding: '3px 8px', borderRadius: 5, border: 'none', cursor: 'pointer',
                              background: 'var(--red)', color: '#fff',
                              fontSize: '0.75rem', fontWeight: 600,
                            }}
                          >
                            {deleting ? '...' : 'Sil'}
                          </button>
                          <button
                            onClick={() => setConfirmId(null)}
                            style={{
                              padding: '3px 8px', borderRadius: 5, border: '1px solid var(--border)',
                              cursor: 'pointer', background: 'none',
                              fontSize: '0.75rem', color: 'var(--muted)',
                            }}
                          >
                            İptal
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmId(p.id)}
                          title="Sil (24 saat içinde)"
                          style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: 'var(--red)', padding: '4px', borderRadius: 6,
                            display: 'flex', alignItems: 'center',
                          }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--red-bg)'; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none'; }}
                        >
                          <Trash2 size={14} strokeWidth={2} />
                        </button>
                      )
                    )}
                  </Td>
                </TRow>
              );
            })}
          </DataTable>
        )}
      </Card>
    </>
  );
}
