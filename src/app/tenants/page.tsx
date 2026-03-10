import { prisma } from '@/lib/db';
import { Card, PageHeader, DataTable, Td, TRow, Badge, EmptyState } from '@/components/ui';
import AddForm from '@/components/AddForm';
import { DeleteButton } from '@/components/DeleteButton';
import { UserCheck } from 'lucide-react';
import { date, initial } from '@/lib/format';

const COLS = [
  { label: 'Ad Soyad'   },
  { label: 'Telefon'    },
  { label: 'E-posta'    },
  { label: 'Sözleşme', center: true },
  { label: 'Kayıt'      },
  { label: ''           },
];

export default async function TenantsPage() {
  const tenants = await prisma.tenant.findMany({
    include: { _count: { select: { contracts: true } } },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div>
      <PageHeader
        title="Kiracılar"
        action={
          <AddForm endpoint="/api/tenants" title="Yeni Kiracı" fields={[
            { name: 'name',       label: 'Ad Soyad',  required: true },
            { name: 'phone',      label: 'Telefon',   placeholder: '05xx xxx xx xx' },
            { name: 'email',      label: 'E-posta',   type: 'email' },
            { name: 'nationalId', label: 'TC Kimlik' },
            { name: 'address',    label: 'Adres' },
          ]} />
        }
      />
      <Card>
        {tenants.length === 0 ? (
          <EmptyState
            icon={UserCheck}
            title="Henüz kiracı eklenmedi"
            desc='"Yeni Kiracı" butonuyla ilk kaydı oluşturun.'
          />
        ) : (
          <DataTable cols={COLS}>
            {tenants.map(t => (
              <TRow key={t.id}>
                <Td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {/* Avatar */}
                    <div style={{
                      width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                      background: 'var(--primary-bg)', color: 'var(--primary)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.8125rem', fontWeight: 700,
                    }}>
                      {initial(t.name)}
                    </div>
                    <span style={{ fontWeight: 600 }}>{t.name}</span>
                  </div>
                </Td>
                <Td muted>{t.phone ?? '—'}</Td>
                <Td muted>{t.email ?? '—'}</Td>
                <Td center>
                  <Badge variant={t._count.contracts > 0 ? 'info' : 'neutral'}>
                    {t._count.contracts}
                  </Badge>
                </Td>
                <Td muted>{date(t.createdAt)}</Td>
                <Td>
                  <DeleteButton endpoint={`/api/tenants/${t.id}`} label={t.name} errorAction={{ label: 'Sözleşmelere Git', href: '/contracts' }} />
                </Td>
              </TRow>
            ))}
          </DataTable>
        )}
      </Card>
    </div>
  );
}
