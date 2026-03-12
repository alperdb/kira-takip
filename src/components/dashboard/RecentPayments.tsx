'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui';

type Payment = {
  id:     number;
  amount: number;
  paidAt: string;
  method: string;
  tenant: string;
  unit:   string;
};

const METHOD_LABELS: Record<string, string> = {
  cash:     'Nakit',
  bank:     'Banka',
  transfer: 'Havale',
  card:     'Kart',
};

const fmt = (n: number) =>
  `₺${n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function RecentPayments() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    fetch('/api/dashboard/recent-payments')
      .then(r => r.ok ? r.json() : [])
      .then(d => { setPayments(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <Card>
      <div style={{
        padding: '18px 24px 0',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <p style={{ fontWeight: 600, fontSize: '0.9375rem', margin: '0 0 2px', color: 'var(--text)' }}>
            Son Ödemeler
          </p>
          <p style={{ fontSize: '0.8125rem', color: 'var(--muted)', margin: 0 }}>En son 8 tahsilat</p>
        </div>
        <Link
          href="/reports?tab=3"
          style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--primary)', textDecoration: 'none' }}
        >
          Tümünü Gör →
        </Link>
      </div>

      <div style={{ padding: '12px 0 4px' }}>
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} style={{
              padding: '10px 24px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div className="skeleton" style={{ width: 120, height: 12, borderRadius: 4 }} />
                <div className="skeleton" style={{ width: 80, height: 10, borderRadius: 4 }} />
              </div>
              <div className="skeleton" style={{ width: 70, height: 14, borderRadius: 4 }} />
            </div>
          ))
        ) : payments.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <p style={{ fontSize: '0.8125rem', color: 'var(--subtle)', margin: 0 }}>Henüz ödeme kaydı yok</p>
          </div>
        ) : (
          payments.map(p => (
            <div
              key={p.id}
              style={{
                padding: '9px 24px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                borderBottom: '1px solid var(--border)',
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface2)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p.tenant}
                </p>
                <p style={{ fontSize: '0.75rem', color: 'var(--muted)', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p.unit} · {new Date(p.paidAt).toLocaleDateString('tr-TR')} · {METHOD_LABELS[p.method] ?? p.method}
                </p>
              </div>
              <span style={{
                fontFamily: 'ui-monospace, monospace', fontWeight: 700,
                fontSize: '0.9375rem', color: 'var(--green)',
                flexShrink: 0, marginLeft: 12,
              }}>
                {fmt(p.amount)}
              </span>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
