'use client';

import Link from 'next/link';
import { Card } from '@/components/ui';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

type Charge = {
  id: number;
  chargeAmount: { toString(): string } | number;
  paidAmount:   { toString(): string } | number;
  dueDate: Date | string;
  tenant: { name: string };
  unit: { unitNo: string; property: { title: string } };
  contract?: { id: number } | null;
};

export function OverdueList({ charges }: { charges: Charge[] }) {
  return (
    <Card style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 0, maxHeight: 380, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <div style={{
          width: 30, height: 30, borderRadius: 8, flexShrink: 0,
          background: 'rgba(239,68,68,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <AlertTriangle size={14} color="var(--red)" strokeWidth={2.5} />
        </div>
        <div>
          <p style={{ fontWeight: 600, fontSize: '0.9375rem', margin: 0, color: 'var(--text)' }}>
            Geciken Alacaklar
          </p>
          <p style={{ fontSize: '0.75rem', color: 'var(--muted)', margin: 0 }}>
            Vadesi geçmiş
          </p>
        </div>
        {charges.length > 0 && (
          <span style={{
            marginLeft: 'auto',
            padding: '2px 8px', borderRadius: 20,
            fontSize: '0.6875rem', fontWeight: 600,
            background: 'var(--red-bg)', color: 'var(--red)',
            border: '1px solid rgba(239,68,68,0.2)',
          }}>
            {charges.length}
          </span>
        )}
      </div>

      {charges.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px 0', gap: 8 }}>
          <CheckCircle2 size={28} color="var(--green)" strokeWidth={1.5} />
          <p style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text)', margin: 0 }}>
            Geciken alacak yok
          </p>
          <p style={{ fontSize: '0.75rem', color: 'var(--subtle)', margin: 0, textAlign: 'center' }}>
            Tüm ödemeler zamanında.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, overflowY: 'auto', maxHeight: 280 }}>
          {charges.map(c => {
            const remaining = Number(c.chargeAmount) - Number(c.paidAmount);
            const overdueDays = Math.floor(
              (Date.now() - new Date(c.dueDate).getTime()) / 86_400_000
            );
            const href = c.contract?.id ? `/contracts/${c.contract.id}` : '/charges';
            return (
              <Link key={c.id} href={href} style={{ textDecoration: 'none' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '9px 11px', borderRadius: 8, cursor: 'pointer',
                  background: 'var(--red-bg)',
                  border: '1px solid rgba(239,68,68,0.15)',
                  transition: 'border-color 0.12s',
                }}>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontWeight: 600, fontSize: '0.8125rem', margin: '0 0 1px', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.tenant.name}
                    </p>
                    <p style={{ fontSize: '0.6875rem', color: 'var(--muted)', margin: 0 }}>
                      {c.unit.property.title} · {c.unit.unitNo}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 10 }}>
                    <p style={{
                      fontSize: '0.8125rem', fontWeight: 700, margin: '0 0 1px',
                      color: 'var(--red)',
                      fontFamily: 'ui-monospace, monospace',
                    }}>
                      ₺{remaining.toLocaleString('tr-TR')}
                    </p>
                    <p style={{ fontSize: '0.6875rem', color: 'var(--subtle)', margin: 0, whiteSpace: 'nowrap' }}>
                      {overdueDays}g gecikmiş
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </Card>
  );
}
