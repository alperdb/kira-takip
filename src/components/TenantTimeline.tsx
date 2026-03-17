'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui';
import { FileText, CreditCard, AlertCircle, CheckCircle2, History } from 'lucide-react';

type TimelineEvent = {
  id:      string;
  type:    'contract_start' | 'contract_end' | 'payment' | 'overdue';
  date:    string;
  title:   string;
  detail:  string;
  amount?: number;
  href?:   string;
};

const TYPE_META = {
  contract_start: { icon: FileText,    color: 'var(--primary)', bg: 'var(--primary-bg)' },
  contract_end:   { icon: FileText,    color: 'var(--amber)',   bg: 'var(--amber-bg)'   },
  payment:        { icon: CreditCard,  color: 'var(--green)',   bg: 'var(--green-bg)'   },
  overdue:        { icon: AlertCircle, color: 'var(--red)',     bg: 'var(--red-bg)'     },
} as const;

const FILTERS = [
  { key: 'all',            label: 'Tümü'       },
  { key: 'payment',        label: 'Ödemeler'   },
  { key: 'overdue',        label: 'Gecikmeler' },
  { key: 'contract_start', label: 'Sözleşmeler'},
] as const;

type FilterKey = typeof FILTERS[number]['key'];

export function TenantTimeline({ tenantId }: { tenantId: number }) {
  const [events,  setEvents]  = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState<FilterKey>('all');

  useEffect(() => {
    fetch(`/api/tenants/${tenantId}/timeline`)
      .then(r => r.ok ? r.json() : [])
      .then(setEvents)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [tenantId]);

  const filtered = filter === 'all'
    ? events
    : events.filter(e =>
        filter === 'contract_start'
          ? (e.type === 'contract_start' || e.type === 'contract_end')
          : e.type === filter
      );

  return (
    <Card style={{ padding: '20px 24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <div style={{
          width: 30, height: 30, borderRadius: 8, flexShrink: 0,
          background: 'var(--surface2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <History size={14} color="var(--muted)" strokeWidth={2.5} />
        </div>
        <p style={{ fontWeight: 600, fontSize: '0.9375rem', margin: 0, color: 'var(--text)' }}>
          Finansal Zaman Çizelgesi
        </p>
      </div>

      {/* Filter pills */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            style={{
              padding: '4px 12px', borderRadius: 20, border: 'none', cursor: 'pointer',
              fontSize: '0.75rem', fontWeight: 600,
              background: filter === f.key ? 'var(--primary)' : 'var(--surface2)',
              color:      filter === f.key ? '#fff'           : 'var(--muted)',
              transition: 'all 0.12s',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <p style={{ fontSize: '0.875rem', color: 'var(--subtle)', margin: 0 }}>Yükleniyor...</p>
      ) : filtered.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 0', gap: 8 }}>
          <CheckCircle2 size={28} color="var(--green)" strokeWidth={1.5} />
          <p style={{ fontSize: '0.875rem', color: 'var(--muted)', margin: 0 }}>Kayıt bulunamadı</p>
        </div>
      ) : (
        <div style={{ position: 'relative' }}>
          {/* Vertical line */}
          <div style={{
            position: 'absolute', left: 14, top: 8, bottom: 8,
            width: 2, background: 'var(--border)', borderRadius: 2,
          }} />

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {filtered.map(event => {
              const meta = TYPE_META[event.type];
              const Icon = meta.icon;

              const inner = (
                <div style={{
                  display: 'flex', alignItems: 'flex-start', gap: 14,
                  padding: '8px 6px 8px 0',
                }}>
                  {/* Dot / icon */}
                  <div style={{
                    width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                    background: meta.bg, color: meta.color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    position: 'relative', zIndex: 1,
                  }}>
                    <Icon size={13} strokeWidth={2.5} />
                  </div>

                  {/* Text */}
                  <div style={{ flex: 1, minWidth: 0, paddingTop: 5 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text)' }}>
                        {event.title}
                      </span>
                      {event.amount != null && (
                        <span style={{
                          fontSize: '0.8125rem', fontWeight: 700,
                          color: event.type === 'overdue' ? 'var(--red)' : 'var(--green)',
                          fontFamily: 'ui-monospace, monospace',
                        }}>
                          ₺{event.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--muted)', margin: '2px 0 0' }}>
                      {event.detail}
                    </p>
                    <p style={{ fontSize: '0.6875rem', color: 'var(--subtle)', margin: '2px 0 0' }}>
                      {new Date(event.date).toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                </div>
              );

              return (
                <div key={event.id}>
                  {event.href ? (
                    <Link
                      href={event.href}
                      style={{ textDecoration: 'none', display: 'block', borderRadius: 8 }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.025)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                    >
                      {inner}
                    </Link>
                  ) : inner}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
}
