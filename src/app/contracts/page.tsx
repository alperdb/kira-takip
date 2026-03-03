import { prisma } from '@/lib/db';
import { Card, PageHeader, DataTable, Td, TRow, EmptyState, Badge, Money } from '@/components/ui';
import { ContractModal } from './ContractModal';
import { FileText } from 'lucide-react';

const COLS = [
  { label: 'Daire'    },
  { label: 'Kiracı'   },
  { label: 'Başlangıç'},
  { label: 'Bitiş'    },
  { label: 'Kira / Ay',  right: true },
  { label: 'Depozito',   right: true },
  { label: 'Durum'    },
];

export default async function ContractsPage() {
  const [contracts, units, tenants] = await Promise.all([
    prisma.contract.findMany({
      include: {
        unit:   { select: { unitNo: true, property: { select: { title: true } } } },
        tenant: { select: { name: true, phone: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.unit.findMany({
      where: { status: 'vacant' },
      select: { id: true, unitNo: true, property: { select: { title: true } } },
      orderBy: { unitNo: 'asc' },
    }),
    prisma.tenant.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
  ]);

  return (
    <div>
      <PageHeader
        title="Sözleşmeler"
        action={<ContractModal units={units} tenants={tenants} />}
      />
      <Card>
        {contracts.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="Henüz sözleşme eklenmedi"
            desc="Boş bir daire ve kiracı seçerek yeni sözleşme oluşturun."
          />
        ) : (
          <DataTable cols={COLS}>
            {contracts.map(c => (
              <TRow key={c.id}>
                <Td>
                  <div style={{ fontWeight: 600 }}>{c.unit.unitNo}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{c.unit.property.title}</div>
                </Td>
                <Td>
                  <div style={{ fontWeight: 500 }}>{c.tenant.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{c.tenant.phone ?? ''}</div>
                </Td>
                <Td muted>{new Date(c.startDate).toLocaleDateString('tr-TR')}</Td>
                <Td muted>{c.endDate ? new Date(c.endDate).toLocaleDateString('tr-TR') : '—'}</Td>
                <Td right><Money amount={c.rentAmount} /></Td>
                <Td right>
                  {Number(c.depositAmount) > 0
                    ? <Money amount={c.depositAmount} />
                    : <span style={{ color: 'var(--subtle)' }}>—</span>}
                </Td>
                <Td><Badge status={c.status} /></Td>
              </TRow>
            ))}
          </DataTable>
        )}
      </Card>
    </div>
  );
}
