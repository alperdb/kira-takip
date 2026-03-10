'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui';
import { Calendar, CheckCircle2 } from 'lucide-react';

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

function urgencyBg(days: number): string {
  if (days <= 2) return 'var(--red-bg)';
  if (days <= 5) return 'var(--amber-bg, var(--surface2))';
  return 'var(--surface2)';
}

function urgencyBorder(days: number): string {
  if (days <= 2) return 'rgba(239,68,68,0.2)';
  if (days <= 5) return 'rgba(245,158,11,0.2)';
  return 'var(--border)';
}

function daysLabel(days: number): string {
  if (days === 0) return 'Bugün';
  if (days === 1) return 'Yarın';
  return `${days}g`;
}

function daysColor(days: number): string {
  if (days <= 2) return 'var(--red)';
  if (days <= 5) return 'var(--amber)';
  return 'var(--muted)';
}

export function UpcomingPayments() {
  const [items,   setItems]   = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard/upcoming-payments')
      .then(r => r.ok ? r.json() : [])
      .then(data => { setItems(Array.isArray(data) ? data : []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <Card style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <div style={{
          width: 30, height: 30, borderRadius: 8, flexShrink: 0,
          background: 'var(--primary-bg)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
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
        {!loading && items.length > 0 && (
          <span style={{
            marginLeft: 'auto',
            padding: '2px 8px', borderRadius: 20,
            fontSize: '0.6875rem', fontWeight: 600,
            background: 'var(--primary-bg)', color: 'var(--primary)',
            border: '1px solid var(--primary-ring)',
          }}>
            {items.length}
          </span>
        )}
      </div>

      {loading ? (
        <p style={{ fontSize: '0.875rem', color: 'var(--subtle)', margin: 0 }}>Yükleniyor...</p>
      ) : items.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px 0', gap: 8 }}>
          <CheckCircle2 size={28} color="var(--green)" strokeWidth={1.5} />
          <p style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text)', margin: 0 }}>
            14 günde ödeme yok
          </p>
          <p style={{ fontSize: '0.75rem', color: 'var(--subtle)', margin: 0, textAlign: 'center' }}>
            Önümüzdeki 14 gün içinde vadesi gelen ödeme bulunmuyor.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {items.map(item => (
            <Link
              key={item.contractId}
              href={`/contracts/${item.contractId}`}
              style={{ textDecoration: 'none' }}
            >
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '9px 11px', borderRadius: 8, cursor: 'pointer',
                background: urgencyBg(item.daysUntil),
                border: `1px solid ${urgencyBorder(item.daysUntil)}`,
                transition: 'border-color 0.12s',
              }}>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontWeight: 600, fontSize: '0.8125rem', margin: '0 0 1px', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.tenantName}
                  </p>
                  <p style={{ fontSize: '0.6875rem', color: 'var(--muted)', margin: 0 }}>
                    {item.propertyTitle} · {item.unitNo}
                  </p>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 10 }}>
                  <p style={{
                    fontSize: '0.8125rem', fontWeight: 700, margin: '0 0 1px',
                    color: 'var(--text)', fontFamily: 'ui-monospace, monospace',
                  }}>
                    ₺{item.chargeAmount.toLocaleString('tr-TR')}
                  </p>
                  <p style={{ fontSize: '0.6875rem', margin: 0, whiteSpace: 'nowrap' }}>
                    <span style={{ color: daysColor(item.daysUntil), fontWeight: 600 }}>
                      {daysLabel(item.daysUntil)}
                    </span>
                    <span style={{ color: 'var(--subtle)' }}>
                      {' · '}{new Date(item.nextDate).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })}
                    </span>
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </Card>
  );
}
