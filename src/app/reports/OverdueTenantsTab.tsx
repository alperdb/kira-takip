'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { AlertCircle } from 'lucide-react';
import { Card, DataTable, Td, TRow, TableSkeleton } from '@/components/ui';

type OverdueRow = {
  chargeId:    number;
  tenantId:    number;
  tenantName:  string;
  tenantPhone: string | null;
  property:    string;
  unitNo:      string;
  dueDate:     string;
  periodStart: string;
  overdue:     number;
};

type Data = { rows: OverdueRow[]; totalOverdue: number; count: number };

const COLS = [
  { label: 'Kiracı'                        },
  { label: 'Mülk / Daire'                  },
  { label: 'Dönem'                         },
  { label: 'Vade',          w: 110         },
  { label: 'Gecikmiş',      right: true    },
];

const fmt      = (n: number) =>
  `₺${n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const TR_MONTHS = ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'];
const fmtPeriod = (s: string) => {
  const d = new Date(s);
  return `${TR_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};
const fmtDate = (s: string) => new Date(s).toLocaleDateString('tr-TR');

export function OverdueTenantsTab() {
  const [data,    setData]    = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/reports/overdue-tenants')
      .then(r => r.ok ? r.json() : null)
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Summary strip */}
      {data && data.count > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          <Card style={{ padding: '14px 18px' }}>
            <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
              Gecikmiş Alacak Sayısı
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--red)' }}>
              {data.count}
            </div>
          </Card>
          <Card style={{ padding: '14px 18px' }}>
            <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
              Toplam Gecikmiş Tutar
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--red)', fontFamily: 'ui-monospace, monospace' }}>
              {fmt(data.totalOverdue)}
            </div>
          </Card>
        </div>
      )}

      <Card>
        {loading ? (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody><TableSkeleton cols={5} rows={6} /></tbody>
          </table>
        ) : !data || data.count === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <div style={{
              width: 44, height: 44, borderRadius: '50%',
              background: 'var(--green-bg)', margin: '0 auto 12px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <AlertCircle size={20} color="var(--green)" strokeWidth={2} />
            </div>
            <p style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text)', margin: '0 0 4px' }}>
              Gecikmiş alacak yok
            </p>
            <p style={{ fontSize: '0.8125rem', color: 'var(--muted)', margin: 0 }}>
              Tüm ödemeler güncel.
            </p>
          </div>
        ) : (
          <DataTable cols={COLS}>
            {data.rows.map(r => (
              <TRow key={r.chargeId}>
                <Td>
                  <Link href={`/tenants/${r.tenantId}`} style={{ textDecoration: 'none' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text)' }}>{r.tenantName}</div>
                    {r.tenantPhone && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{r.tenantPhone}</div>
                    )}
                  </Link>
                </Td>
                <Td>
                  <div style={{ fontWeight: 500 }}>{r.property}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Daire {r.unitNo}</div>
                </Td>
                <Td muted>{fmtPeriod(r.periodStart)}</Td>
                <Td>
                  <span style={{ fontSize: '0.8125rem', color: 'var(--red)', fontWeight: 600 }}>
                    {fmtDate(r.dueDate)}
                  </span>
                </Td>
                <Td right>
                  <span style={{ fontFamily: 'ui-monospace, monospace', fontWeight: 700, color: 'var(--red)' }}>
                    {fmt(r.overdue)}
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
