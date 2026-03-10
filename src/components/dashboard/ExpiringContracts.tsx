'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui';
import { FileWarning, CheckCircle2 } from 'lucide-react';

type Contract = {
  id:          number;
  endDate:     string;
  tenantName:  string;
  propertyTitle: string;
  unitNo:      string;
  daysLeft?:   number;
};

type Data = {
  within30Days: RawContract[];
  within60Days: RawContract[];
  within90Days: RawContract[];
};

type RawContract = {
  id:          number;
  endDate:     string;
  tenant:      { name: string };
  unit:        { unitNo: string; property: { title: string } };
};

function daysLeft(endDate: string): number {
  return Math.ceil((new Date(endDate).getTime() - Date.now()) / 86_400_000);
}

function flatten(data: Data): Contract[] {
  const all = [
    ...data.within30Days,
    ...data.within60Days,
    ...data.within90Days,
  ];
  return all
    .map(c => ({
      id:            c.id,
      endDate:       c.endDate,
      tenantName:    c.tenant.name,
      propertyTitle: c.unit.property.title,
      unitNo:        c.unit.unitNo,
      daysLeft:      daysLeft(c.endDate),
    }))
    .sort((a, b) => (a.daysLeft ?? 0) - (b.daysLeft ?? 0));
}

function urgencyColor(days: number): string {
  if (days <= 30) return 'var(--red)';
  if (days <= 60) return 'var(--amber)';
  return 'var(--muted)';
}

function urgencyBg(days: number): string {
  if (days <= 30) return 'var(--red-bg)';
  if (days <= 60) return 'var(--amber-bg, var(--surface2))';
  return 'var(--surface2)';
}

export function ExpiringContracts() {
  const [items,   setItems]   = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/contracts/expiring')
      .then(r => r.ok ? r.json() : null)
      .then((d: Data | null) => {
        if (d) setItems(flatten(d));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <Card style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <div style={{
          width: 30, height: 30, borderRadius: 8, flexShrink: 0,
          background: 'rgba(239,68,68,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <FileWarning size={14} color="var(--red)" strokeWidth={2.5} />
        </div>
        <div>
          <p style={{ fontWeight: 600, fontSize: '0.9375rem', margin: 0, color: 'var(--text)' }}>
            Biten Sözleşmeler
          </p>
          <p style={{ fontSize: '0.75rem', color: 'var(--muted)', margin: 0 }}>
            Önümüzdeki 90 gün
          </p>
        </div>
        {!loading && items.length > 0 && (
          <span style={{
            marginLeft: 'auto',
            padding: '2px 8px', borderRadius: 20,
            fontSize: '0.6875rem', fontWeight: 600,
            background: 'var(--red-bg)', color: 'var(--red)',
            border: '1px solid rgba(239,68,68,0.2)',
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
            Yaklaşan bitiş yok
          </p>
          <p style={{ fontSize: '0.75rem', color: 'var(--subtle)', margin: 0, textAlign: 'center' }}>
            90 gün içinde biten sözleşme bulunmuyor.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {items.map(item => (
            <Link
              key={item.id}
              href={`/contracts/${item.id}`}
              style={{ textDecoration: 'none' }}
            >
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '9px 11px', borderRadius: 8, cursor: 'pointer',
                background: urgencyBg(item.daysLeft ?? 90),
                border: '1px solid var(--border)',
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
                    color: urgencyColor(item.daysLeft ?? 90),
                    fontFamily: 'ui-monospace, monospace',
                  }}>
                    {item.daysLeft}g
                  </p>
                  <p style={{ fontSize: '0.6875rem', color: 'var(--subtle)', margin: 0, whiteSpace: 'nowrap' }}>
                    {new Date(item.endDate).toLocaleDateString('tr-TR')}
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
