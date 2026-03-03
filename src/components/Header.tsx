'use client';

import { usePathname } from 'next/navigation';
import { ChevronRight } from 'lucide-react';

const labels: Record<string, string> = {
  '':           'Dashboard',
  'owners':     'Sahipler',
  'properties': 'Binalar',
  'units':      'Daireler',
  'tenants':    'Kiracılar',
  'contracts':  'Sözleşmeler',
  'charges':    'Alacaklar',
};

export default function Header() {
  const pathname = usePathname();
  const segment  = pathname.split('/').filter(Boolean)[0] ?? '';
  const current  = labels[segment] ?? segment;

  return (
    <header style={{
      height: 56,
      background: 'var(--surface)',
      borderBottom: '1px solid var(--border)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 28px',
      position: 'sticky', top: 0, zIndex: 40,
    }}>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.875rem' }}>
        <span style={{ color: 'var(--text-subtle)', fontWeight: 400 }}>Kira Takip</span>
        <ChevronRight size={14} color="var(--text-subtle)" />
        <span style={{ color: 'var(--text)', fontWeight: 600 }}>{current}</span>
      </div>

      {/* User */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text)' }}>Admin</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>admin@kiratakip.app</div>
        </div>
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          background: 'var(--accent-bg)', border: '2px solid var(--accent-muted)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.8125rem', fontWeight: 700, color: 'var(--accent)',
        }}>A</div>
      </div>
    </header>
  );
}
