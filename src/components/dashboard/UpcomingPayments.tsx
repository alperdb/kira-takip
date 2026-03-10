'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui';
import { Calendar } from 'lucide-react';

type Item = {
  contractId:    number;
  tenantName:    string;
  propertyTitle: string;
  unitNo:        string;
  paymentDay:    number;
  nextDate:      string;
  daysUntil:     number;
  chargeAmount:  number;
};

export function UpcomingPayments() {
  const [items,   setItems]   = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard/upcoming-payments')
      .then(r => r.ok ? r.json() : [])
      .then(data => { setItems(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <Card style={{ padding: '20px 24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <div style={{
          width: 30, height: 30, borderRadius: 8,
          background: 'var(--primary-bg)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Calendar size={14} color="var(--primary)" strokeWidth={2.5} />
        </div>
        <div>
          <p style={{ fontWeight: 600, fontSize: '0.9375rem', margin: 0, color: 'var(--text)' }}>
            Yaklaşan Ödemeler
          </p>
          <p style={{ fontSize: '0.75rem', color: 'var(--muted)', margin: 0 }}>
            Önümüzdeki 14 gün
          </p>
        </div>
      </div>

      {loading ? (
        <p style={{ fontSize: '0.875rem', color: 'var(--subtle)', margin: 0 }}>Yükleniyor...</p>
      ) : items.length === 0 ? (
        <p style={{ fontSize: '0.875rem', color: 'var(--subtle)', margin: 0, textAlign: 'center' }}>
          Önümüzdeki 14 günde ödeme yok.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {items.map(item => (
            <div
              key={item.contractId}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 12px', borderRadius: 8,
                background: item.daysUntil <= 2 ? 'var(--red-bg)' : item.daysUntil <= 5 ? 'var(--amber-bg, var(--surface2))' : 'var(--surface2)',
                border: `1px solid ${item.daysUntil <= 2 ? 'rgba(239,68,68,0.2)' : 'var(--border)'}`,
              }}
            >
              <div>
                <p style={{ fontWeight: 600, fontSize: '0.875rem', margin: '0 0 2px', color: 'var(--text)' }}>
                  {item.tenantName}
                </p>
                <p style={{ fontSize: '0.75rem', color: 'var(--muted)', margin: 0 }}>
                  {item.propertyTitle} · {item.unitNo}
                </p>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <p style={{
                  fontFamily: 'ui-monospace, monospace', fontWeight: 700,
                  fontSize: '0.875rem', margin: '0 0 2px',
                  color: 'var(--text)',
                }}>
                  ₺{item.chargeAmount.toLocaleString('tr-TR')}
                </p>
                <p style={{
                  fontSize: '0.6875rem', margin: 0,
                  color: item.daysUntil <= 2 ? 'var(--red)' : 'var(--muted)',
                  fontWeight: item.daysUntil <= 2 ? 600 : 400,
                }}>
                  {item.daysUntil === 0 ? 'Bugün' : item.daysUntil === 1 ? 'Yarın' : `${item.daysUntil} gün`}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
