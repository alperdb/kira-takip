'use client';

import Link from 'next/link';
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
  { label: '', w: 56  },
];

export default function OwnersTable({ owners }: { owners: Owner[] }) {
  if (owners.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="Henüz mülk sahibi yok"
        desc="Mülk sahibi kaydı oluşturarak bina ve daire yönetimine başlayın."
        action={
          <span style={{ fontSize: '0.8125rem', color: 'var(--primary)', fontWeight: 600 }}>
            Sağ üstteki "Yeni Mülk Sahibi" butonuna tıklayın
          </span>
        }
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
          <Td action>
            <DeleteButton endpoint={`/api/owners/${o.id}`} label={o.name} errorAction={{ label: 'Binalara Git', href: '/properties' }} />
          </Td>
        </TRow>
      ))}
    </DataTable>
  );
}
