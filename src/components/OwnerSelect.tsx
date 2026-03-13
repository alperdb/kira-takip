'use client';

import { useRouter, usePathname } from 'next/navigation';

type Owner = { id: number; name: string };

export function OwnerSelect({
  owners,
  currentOwnerId,
}: {
  owners: Owner[];
  currentOwnerId?: number;
}) {
  const router   = useRouter();
  const pathname = usePathname();

  if (owners.length <= 1) return null;

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    if (e.target.value) {
      router.replace(`${pathname}?ownerId=${e.target.value}`);
    } else {
      router.replace(pathname);
    }
  }

  return (
    <select
      value={currentOwnerId ?? ''}
      onChange={handleChange}
      style={{
        height: 34, padding: '0 10px',
        border: '1px solid var(--border)', borderRadius: 8,
        background: 'var(--surface)', color: 'var(--text)',
        fontSize: '0.875rem', cursor: 'pointer', minWidth: 170,
      }}
    >
      <option value="">Tüm Sahipler</option>
      {owners.map(o => (
        <option key={o.id} value={String(o.id)}>{o.name}</option>
      ))}
    </select>
  );
}
