import { Card, DataTable, Td, TRow, EmptyState, Badge } from '@/components/ui';
import { AlertTriangle } from 'lucide-react';

type Charge = {
  id: number;
  chargeAmount: { toString(): string } | number;
  paidAmount:   { toString(): string } | number;
  dueDate: Date | string;
  tenant: { name: string };
  unit: { unitNo: string; property: { title: string } };
};

const COLS = [
  { label: 'Kiracı'                },
  { label: 'Daire'                 },
  { label: 'Vade Tarihi'           },
  { label: 'Kalan', right: true    },
];

export function OverdueList({ charges }: { charges: Charge[] }) {
  return (
    <Card>
      {/* Header */}
      <div style={{
        padding: '16px 24px', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--red)', flexShrink: 0 }} />
        <span style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--text)' }}>
          Geciken Alacaklar
        </span>
        <Badge variant="danger">{charges.length}</Badge>
      </div>

      {charges.length === 0 ? (
        <EmptyState
          icon={AlertTriangle}
          title="Geciken alacak yok"
          desc="Tüm ödemeler zamanında yapılmış."
        />
      ) : (
        <DataTable cols={COLS}>
          {charges.map(c => {
            const remaining = Number(c.chargeAmount) - Number(c.paidAmount);
            const overdueDays = Math.floor(
              (Date.now() - new Date(c.dueDate).getTime()) / 86_400_000
            );
            return (
              <TRow key={c.id}>
                <Td>
                  <span style={{ fontWeight: 500 }}>{c.tenant.name}</span>
                </Td>
                <Td muted>{c.unit.property.title} · {c.unit.unitNo}</Td>
                <Td>
                  <div style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>
                    {new Date(c.dueDate).toLocaleDateString('tr-TR')}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--red)', marginTop: 1 }}>
                    {overdueDays} gün gecikmiş
                  </div>
                </Td>
                <Td right>
                  <span style={{
                    fontFamily: 'ui-monospace, monospace',
                    fontWeight: 700, color: 'var(--red)',
                  }}>
                    ₺{remaining.toLocaleString('tr-TR')}
                  </span>
                </Td>
              </TRow>
            );
          })}
        </DataTable>
      )}
    </Card>
  );
}
