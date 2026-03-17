'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card } from '@/components/ui';
import { History, CheckCircle2 } from 'lucide-react';
import { DeleteButton } from '@/components/DeleteButton';

type Row = {
  id:           number;
  paidAt:       string;
  amount:       number;
  method:       string;
  referenceNo:  string | null;
  notes:        string | null;
  chargePeriod: string;
  balanceAfter: number;
  unitLabel?:   string;
  contractId?:  number;
};

const METHOD_LABELS: Record<string, string> = {
  bank:  'Banka',
  cash:  'Nakit',
  eft:   'EFT',
  check: 'Çek',
  other: 'Diğer',
};

export function PaymentHistoryCard({ endpoint }: { endpoint: string }) {
  const [rows,    setRows]    = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(() => {
    setLoading(true);
    fetch(endpoint)
      .then(r => r.ok ? r.json() : [])
      .then(setRows)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [endpoint]);

  useEffect(() => { reload(); }, [reload]);

  return (
    <Card style={{ padding: '20px 24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <div style={{
          width: 30, height: 30, borderRadius: 8, flexShrink: 0,
          background: 'var(--green-bg)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <History size={14} color="var(--green)" strokeWidth={2.5} />
        </div>
        <div>
          <p style={{ fontWeight: 600, fontSize: '0.9375rem', margin: 0, color: 'var(--text)' }}>
            Ödeme Geçmişi
          </p>
          <p style={{ fontSize: '0.75rem', color: 'var(--muted)', margin: 0 }}>
            En yeniden eskiye
          </p>
        </div>
        {!loading && rows.length > 0 && (
          <span style={{
            marginLeft: 'auto',
            padding: '2px 8px', borderRadius: 20,
            fontSize: '0.6875rem', fontWeight: 600,
            background: 'var(--surface2)', color: 'var(--muted)',
            border: '1px solid var(--border)',
          }}>
            {rows.length} kayıt
          </span>
        )}
      </div>

      {loading ? (
        <p style={{ fontSize: '0.875rem', color: 'var(--subtle)', margin: 0 }}>Yükleniyor...</p>
      ) : rows.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '16px 0' }}>
          <CheckCircle2 size={28} color="var(--subtle)" strokeWidth={1.5} />
          <p style={{ fontSize: '0.875rem', color: 'var(--muted)', margin: 0 }}>
            Henüz ödeme kaydı yok.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {rows.map(row => (
            <div key={row.id} style={{
              padding: '10px 12px', borderRadius: 8,
              background: 'var(--surface2)', border: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
            }}>
              {/* Left: date + period + note */}
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text)' }}>
                    {new Date(row.paidAt).toLocaleDateString('tr-TR')}
                  </span>
                  <span style={{
                    fontSize: '0.6875rem', padding: '1px 6px', borderRadius: 4,
                    background: 'var(--surface)', border: '1px solid var(--border)',
                    color: 'var(--muted)', fontWeight: 500,
                  }}>
                    {METHOD_LABELS[row.method] ?? row.method}
                  </span>
                </div>

                <p style={{ fontSize: '0.75rem', color: 'var(--muted)', margin: '0 0 2px' }}>
                  {row.chargePeriod}
                  {row.unitLabel && (
                    <span style={{ color: 'var(--subtle)' }}> · {row.unitLabel}</span>
                  )}
                </p>

                {(row.referenceNo || row.notes) && (
                  <p style={{ fontSize: '0.6875rem', color: 'var(--subtle)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {[row.referenceNo, row.notes].filter(Boolean).join(' · ')}
                  </p>
                )}
              </div>

              {/* Right: amount + balance + delete */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                <div style={{ textAlign: 'right' }}>
                  <p style={{
                    fontSize: '0.9375rem', fontWeight: 700, margin: '0 0 2px',
                    color: 'var(--green)', fontFamily: 'ui-monospace, monospace',
                  }}>
                    +₺{row.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <p style={{ fontSize: '0.6875rem', color: 'var(--subtle)', margin: 0, whiteSpace: 'nowrap' }}>
                    {row.balanceAfter === 0
                      ? <span style={{ color: 'var(--green)', fontWeight: 600 }}>Kapandı</span>
                      : <>Kalan: ₺{row.balanceAfter.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</>
                    }
                  </p>
                </div>
                <DeleteButton
                  endpoint={`/api/payments/${row.id}`}
                  label={`₺${row.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} — ${row.chargePeriod}`}
                  warningText="Ödeme silinir ve alacak bakiyesi güncellenir. Yalnızca son 24 saat içindeki ödemeler silinebilir."
                  onDeleted={reload}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
