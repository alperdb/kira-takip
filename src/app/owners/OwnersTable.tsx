'use client';

import { Users } from 'lucide-react';
import { DataTable, Td, TRow, Badge, EmptyState } from '@/components/ui';
import { DeleteButton } from '@/components/DeleteButton';

type Owner = {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  createdAt: Date;
  _count: { properties: number };
};

const COLS = [
  { label: 'Ad Soyad'  },
  { label: 'Telefon'   },
  { label: 'E-posta'   },
  { label: 'Bina',    center: true },
  { label: 'Kayıt'     },
  { label: ''          },
];

export default function OwnersTable({ owners }: { owners: Owner[] }) {
  if (owners.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="Henüz mülk sahibi eklenmedi"
        desc='Sağ üstteki "Yeni Mülk Sahibi" butonuyla ilk kaydı oluşturun.'
      />
    );
  }

  return (
    <DataTable cols={COLS}>
      {owners.map(o => (
        <TRow key={o.id}>
          <Td>
            <span style={{ fontWeight: 600 }}>{o.name}</span>
          </Td>
          <Td muted>{o.phone ?? '—'}</Td>
          <Td muted>{o.email ?? '—'}</Td>
          <Td center>
            <Badge variant={o._count.properties > 0 ? 'info' : 'neutral'}>
              {o._count.properties}
            </Badge>
          </Td>
          <Td muted>{new Date(o.createdAt).toLocaleDateString('tr-TR')}</Td>
          <Td>
            <DeleteButton endpoint={`/api/owners/${o.id}`} label={o.name} errorAction={{ label: 'Binalara Git', href: '/properties' }} />
          </Td>
        </TRow>
      ))}
    </DataTable>
  );
}
