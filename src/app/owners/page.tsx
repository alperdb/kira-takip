import { prisma } from '@/lib/db';
import { Card, PageHeader } from '@/components/ui';
import AddForm from '@/components/AddForm';
import OwnersTable from './OwnersTable';

export default async function OwnersPage() {
  const owners = await prisma.owner.findMany({
    include: { _count: { select: { properties: true } } },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div>
      <PageHeader
        title="Mülk Sahipleri"
        action={
          <AddForm
            endpoint="/api/owners"
            title="Yeni Mülk Sahibi"
            fields={[
              { name: 'name',       label: 'Ad Soyad',  required: true },
              { name: 'phone',      label: 'Telefon',   placeholder: '05xx xxx xx xx' },
              { name: 'email',      label: 'E-posta',   type: 'email' },
              { name: 'nationalId', label: 'TC Kimlik' },
              { name: 'address',    label: 'Adres' },
            ]}
          />
        }
      />
      <Card>
        <OwnersTable owners={owners} />
      </Card>
    </div>
  );
}
