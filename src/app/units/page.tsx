import { prisma } from '@/lib/db';
import { Card, PageHeader, DataTable, Td, TRow, Badge, Money, EmptyState } from '@/components/ui';
import AddForm from '@/components/AddForm';
import { DeleteButton } from '@/components/DeleteButton';
import { DoorOpen } from 'lucide-react';

const TYPE_LABEL: Record<string, string> = {
  residential: 'Konut', commercial: 'Ticari',
  parking: 'Otopark', storage: 'Depo',
};

const COLS = [
  { label: 'Daire No'  },
  { label: 'Bina'      },
  { label: 'Kat'       },
  { label: 'Tür'       },
  { label: 'Durum'     },
  { label: 'Kiracı'    },
  { label: 'Kira', right: true },
  { label: ''          },
];

export default async function UnitsPage() {
  const [units, properties] = await Promise.all([
    prisma.unit.findMany({
      include: {
        property: { select: { title: true } },
        contracts: {
          where: { status: 'active' },
          select: { tenant: { select: { name: true } }, rentAmount: true, currency: true },
          take: 1,
        },
      },
      orderBy: [{ propertyId: 'asc' }, { unitNo: 'asc' }],
    }),
    prisma.property.findMany({ select: { id: true, title: true }, orderBy: { title: 'asc' } }),
  ]);

  return (
    <div>
      <PageHeader
        title="Daireler"
        action={
          <AddForm endpoint="/api/units" title="Yeni Daire" fields={[
            { name: 'propertyId', label: 'Bina',      required: true, options: properties.map(p => ({ value: String(p.id), label: p.title })) },
            { name: 'unitNo',     label: 'Daire No',  required: true, placeholder: 'D-3' },
            { name: 'floor',      label: 'Kat',       type: 'number' },
            { name: 'type',       label: 'Tür', options: [
              { value: 'residential', label: 'Konut'   },
              { value: 'commercial',  label: 'Ticari'  },
              { value: 'parking',     label: 'Otopark' },
              { value: 'storage',     label: 'Depo'    },
            ]},
            { name: 'netSqm',   label: 'Net m²',  type: 'number' },
            { name: 'grossSqm', label: 'Brüt m²', type: 'number' },
          ]} />
        }
      />
      <Card>
        {units.length === 0 ? (
          <EmptyState
            icon={DoorOpen}
            title="Henüz daire eklenmedi"
            desc='Önce bir bina ekleyin, ardından "Yeni Daire" ile daire oluşturun.'
          />
        ) : (
          <DataTable cols={COLS}>
            {units.map(u => {
              const contract = u.contracts[0];
              return (
                <TRow key={u.id}>
                  <Td><span style={{ fontWeight: 600 }}>{u.unitNo}</span></Td>
                  <Td muted>{u.property.title}</Td>
                  <Td muted>{u.floor != null ? `${u.floor}. Kat` : '—'}</Td>
                  <Td muted>{TYPE_LABEL[u.type] ?? u.type}</Td>
                  <Td><Badge status={u.status} /></Td>
                  <Td>{contract?.tenant.name ?? <span style={{ color: 'var(--subtle)' }}>—</span>}</Td>
                  <Td right>
                    {contract
                      ? <Money amount={contract.rentAmount} />
                      : <span style={{ color: 'var(--subtle)' }}>—</span>}
                  </Td>
                  <Td>
                    <DeleteButton endpoint={`/api/units/${u.id}`} label={`${u.property.title} — ${u.unitNo}`} errorAction={{ label: 'Sözleşmelere Git', href: '/contracts' }} />
                  </Td>
                </TRow>
              );
            })}
          </DataTable>
        )}
      </Card>
    </div>
  );
}
