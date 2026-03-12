'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard, Users, Building2, DoorOpen,
  UserCheck, FileText, Receipt, Settings,
  PanelLeftClose, PanelLeftOpen,
  TrendingDown, BarChart3,
} from 'lucide-react';

const NAV = [
  { href: '/',           label: 'Dashboard',   icon: LayoutDashboard },
  { href: '/owners',     label: 'Sahipler',    icon: Users           },
  { href: '/properties', label: 'Binalar',     icon: Building2       },
  { href: '/units',      label: 'Daireler',    icon: DoorOpen        },
  { href: '/tenants',    label: 'Kiracılar',   icon: UserCheck       },
  { href: '/contracts',  label: 'Sözleşmeler', icon: FileText        },
  { href: '/charges',    label: 'Alacaklar',   icon: Receipt         },
  { href: '/expenses',   label: 'Giderler',    icon: TrendingDown    },
  { href: '/reports',    label: 'Raporlar',    icon: BarChart3       },
];

export function Sidebar() {
  const pathname   = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  // Restore from localStorage after hydration
  useEffect(() => {
    if (pathname === '/login') return;
    try {
      const saved = localStorage.getItem('sidebar-collapsed') === '1';
      setCollapsed(saved);
      document.documentElement.classList.toggle('sidebar-collapsed', saved);
    } catch { /* ignore */ }
  }, [pathname]);

  if (pathname === '/login') return null;

  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    document.documentElement.classList.toggle('sidebar-collapsed', next);
    try { localStorage.setItem('sidebar-collapsed', next ? '1' : '0'); } catch { /* ignore */ }
  }

  const w = collapsed ? 56 : 240;

  return (
    <aside style={{
      position: 'fixed', top: 0, left: 0, bottom: 0,
      width: w, zIndex: 50,
      background: 'var(--sidebar)',
      borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column',
      transition: 'width 0.25s ease',
      overflow: 'hidden',
    }}>

      {/* ── Logo ── */}
      <div style={{
        padding: collapsed ? '16px 12px' : '20px 16px 16px',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center',
        gap: collapsed ? 0 : 10,
        justifyContent: collapsed ? 'center' : 'flex-start',
        transition: 'padding 0.25s ease',
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: 'var(--primary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Building2 size={15} color="#fff" strokeWidth={2.5} />
        </div>
        {!collapsed && (
          <div>
            <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.01em', lineHeight: 1.2 }}>
              Kira Takip
            </div>
            <div style={{ fontSize: '0.6875rem', color: 'var(--subtle)', fontWeight: 500, marginTop: 1 }}>
              Mülk Yönetimi
            </div>
          </div>
        )}
      </div>

      {/* ── Nav ── */}
      <nav style={{
        flex: 1, padding: '8px',
        display: 'flex', flexDirection: 'column', gap: 1,
        overflowY: 'auto', overflowX: 'hidden',
      }}>
        {!collapsed && (
          <p style={{
            fontSize: '0.6875rem', fontWeight: 600, color: 'var(--subtle)',
            textTransform: 'uppercase', letterSpacing: '0.08em',
            padding: '12px 8px 6px',
          }}>
            Menü
          </p>
        )}

        {NAV.map(({ href, label, icon: Icon }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={`sidebar-link${active ? ' active' : ''}`}
              style={{
                justifyContent: collapsed ? 'center' : 'flex-start',
                padding: collapsed ? '9px' : '7px 9px',
              }}
            >
              <Icon size={15} strokeWidth={active ? 2.5 : 2} style={{ flexShrink: 0 }} />
              {!collapsed && label}
            </Link>
          );
        })}
      </nav>

      {/* ── Footer ── */}
      <div style={{ padding: '8px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {/* Settings */}
        <Link
          href="/settings"
          className={`sidebar-link${pathname === '/settings' ? ' active' : ''}`}
          style={{
            justifyContent: collapsed ? 'center' : 'flex-start',
            padding: collapsed ? '9px' : '7px 9px',
          }}
          title={collapsed ? 'Ayarlar' : undefined}
        >
          <Settings size={15} strokeWidth={2} style={{ flexShrink: 0 }} />
          {!collapsed && 'Ayarlar'}
        </Link>

        {/* Collapse toggle */}
        <button
          onClick={toggle}
          className="sidebar-link"
          style={{
            justifyContent: collapsed ? 'center' : 'flex-start',
            padding: collapsed ? '9px' : '7px 9px',
            width: '100%', border: 'none', cursor: 'pointer',
          }}
          title={collapsed ? 'Genişlet' : 'Daralt'}
        >
          {collapsed
            ? <PanelLeftOpen  size={15} strokeWidth={2} style={{ flexShrink: 0 }} />
            : <PanelLeftClose size={15} strokeWidth={2} style={{ flexShrink: 0 }} />
          }
          {!collapsed && 'Daralt'}
        </button>
      </div>
    </aside>
  );
}
