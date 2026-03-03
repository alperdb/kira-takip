'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/',           label: 'Dashboard'    },
  { href: '/owners',     label: 'Sahipler'     },
  { href: '/properties', label: 'Binalar'      },
  { href: '/units',      label: 'Daireler'     },
  { href: '/tenants',    label: 'Kiracılar'    },
  { href: '/contracts',  label: 'Sözleşmeler'  },
  { href: '/charges',    label: 'Alacaklar'    },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      background: 'var(--surface)', borderBottom: '1px solid var(--border)',
      height: 52,
    }}>
      <div style={{
        maxWidth: 1400, margin: '0 auto', height: '100%',
        display: 'flex', alignItems: 'center', gap: 4, padding: '0 24px',
      }}>
        <span style={{
          fontWeight: 800, fontSize: '1rem', color: 'var(--primary)',
          marginRight: 24, letterSpacing: '-0.02em', whiteSpace: 'nowrap',
        }}>
          Kira Takip
        </span>

        {links.map(({ href, label }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              style={{
                padding: '6px 12px',
                borderRadius: 8,
                fontSize: '0.875rem',
                fontWeight: active ? 700 : 500,
                color: active ? 'var(--primary)' : 'var(--muted)',
                background: active ? 'var(--primary-bg)' : 'transparent',
                textDecoration: 'none',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s',
              }}
            >
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
