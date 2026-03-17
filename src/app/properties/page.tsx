import Link from 'next/link';
import { prisma } from '@/lib/db';
import { Card, PageHeader, DataTable, Td, TRow, Badge, EmptyState } from '@/components/ui';
import AddForm from '@/components/AddForm';
import { DeleteButton } from '@/components/DeleteButton';
import { Building2 } from 'lucide-react';
import { date } from '@/lib/format';

const TYPE_LABEL: Record<string, string> = {
  apartment: 'Apartman', villa: 'Villa', commercial: 'Ticari', mixed: 'Karma',
};

const COLS = [
  { label: 'Bina'       },
  { label: 'Sahip'      },
  { label: 'Konum'      },
  { label: 'Tür'        },
  { label: 'Daire', center: true },
  { label: 'Kayıt'      },
  { label: '', w: 56   },
];

export default async function PropertiesPage() {
  const [properties, owners] = await Promise.all([
    prisma.property.findMany({
      include: {
        owner: { select: { name: true } },
        _count: { select: { units: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.owner.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
  ]);

  return (
    <div>
      <PageHeader
        title="Binalar"
        action={
          <AddForm endpoint="/api/properties" title="Yeni Bina" fields={[
            { name: 'ownerId',  label: 'Mülk Sahibi', required: true, options: owners.map(o => ({ value: String(o.id), label: o.name })) },
            { name: 'title',    label: 'Bina Adı',    required: true },
            { name: 'city',     label: 'Şehir',       placeholder: 'İstanbul' },
            { name: 'district', label: 'İlçe',        placeholder: 'Kadıköy' },
            { name: 'address',  label: 'Adres' },
            { name: 'type',     label: 'Tür', options: [
              { value: 'apartment',  label: 'Apartman' },
              { value: 'villa',      label: 'Villa'    },
              { value: 'commercial', label: 'Ticari'   },
              { value: 'mixed',      label: 'Karma'    },
            ]},
          ]} />
        }
      />
      <Card>
        {properties.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="Henüz bina yok"
            desc={owners.length === 0
              ? 'Bina ekleyebilmek için önce bir mülk sahibi kaydı oluşturmanız gerekiyor.'
              : 'Sağ üstteki "Yeni Bina" butonuyla ilk binanızı ekleyin.'}
            action={owners.length === 0
              ? <Link href="/owners" style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--primary)', textDecoration: 'none' }}>Mülk Sahiplerine Git →</Link>
              : undefined}
          />
        ) : (
          <DataTable cols={COLS}>
            {properties.map(p => (
              <TRow key={p.id}>
                <Td><span style={{ fontWeight: 600 }}>{p.title}</span></Td>
                <Td muted>{p.owner.name}</Td>
                <Td muted>{[p.district, p.city].filter(Boolean).join(', ') || '—'}</Td>
                <Td muted>{TYPE_LABEL[p.type] ?? p.type}</Td>
                <Td center>
                  <Badge variant={p._count.units > 0 ? 'info' : 'neutral'}>
                    {p._count.units}
                  </Badge>
                </Td>
                <Td muted>{date(p.createdAt)}</Td>
                <Td action>
                  <DeleteButton endpoint={`/api/properties/${p.id}`} label={p.title} mode="archive" />
                </Td>
              </TRow>
            ))}
          </DataTable>
        )}
      </Card>
    </div>
  );
}
