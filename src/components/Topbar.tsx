'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { ChevronRight, Settings, LogOut, User, ChevronDown, Moon, Sun } from 'lucide-react';

const LABELS: Record<string, string> = {
  '/':           'Dashboard',
  '/owners':     'Mülk Sahipleri',
  '/properties': 'Binalar',
  '/units':      'Daireler',
  '/tenants':    'Kiracılar',
  '/contracts':  'Sözleşmeler',
  '/charges':    'Alacaklar',
  '/settings':   'Ayarlar',
};

function matchLabel(pathname: string): string {
  if (LABELS[pathname]) return LABELS[pathname];
  const key = Object.keys(LABELS).find(k => k !== '/' && pathname.startsWith(k));
  return key ? LABELS[key] : 'Sayfa';
}

// ── Dark mode toggle ────────────────────────────────────
function useTheme() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('theme');
    const sysDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = saved ? saved === 'dark' : sysDark;
    setDark(isDark);
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light');
    localStorage.setItem('theme', next ? 'dark' : 'light');
  }

  return { dark, toggle };
}

// ── User dropdown ──────────────────────────────────────
function UserDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { dark, toggle: toggleTheme } = useTheme();

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Trigger */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'none', border: 'none', cursor: 'pointer',
          padding: '4px 6px', borderRadius: 8,
          transition: 'background 0.1s',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--surface2)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none'; }}
      >
        <div style={{
          width: 30, height: 30, borderRadius: '50%',
          background: 'var(--primary-bg)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--primary)', fontSize: '0.75rem', fontWeight: 700,
          userSelect: 'none', flexShrink: 0,
        }}>
          A
        </div>
        <ChevronDown
          size={12}
          strokeWidth={2}
          color="var(--subtle)"
          style={{ transition: 'transform 0.15s', transform: open ? 'rotate(180deg)' : 'none' }}
        />
      </button>

      {/* Menu */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0,
          width: 200,
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
          overflow: 'hidden', zIndex: 100,
        }}>
          {/* User info */}
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text)' }}>Admin</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: 1 }}>admin@kira.app</div>
          </div>

          {/* Menu items */}
          <div style={{ padding: 6 }}>
            <DropdownItem icon={User}               label="Profil"  />
            <DropdownItem icon={Settings}           label="Ayarlar" />
            <DropdownItem
              icon={dark ? Sun : Moon}
              label={dark ? 'Açık Tema' : 'Koyu Tema'}
              onClick={toggleTheme}
            />
            <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
            <DropdownItem icon={LogOut}             label="Çıkış"   danger />
          </div>
        </div>
      )}
    </div>
  );
}

function DropdownItem({ icon: Icon, label, danger, onClick }: {
  icon: React.ElementType;
  label: string;
  danger?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 10px', borderRadius: 8, width: '100%',
        background: 'none', border: 'none', cursor: 'pointer',
        fontSize: '0.875rem', fontWeight: 500,
        color: danger ? 'var(--red)' : 'var(--text)',
        transition: 'background 0.1s',
        textAlign: 'left',
      }}
      onClick={onClick}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--surface2)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none'; }}
    >
      <Icon size={14} strokeWidth={2} />
      {label}
    </button>
  );
}

// ── Topbar ──────────────────────────────────────────────
export function Topbar() {
  const pathname = usePathname();
  const label    = matchLabel(pathname);
  const isRoot   = pathname === '/';

  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 40,
      height: 56, flexShrink: 0,
      background: 'var(--surface)',
      borderBottom: '1px solid var(--border)',
      display: 'flex', alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
    }}>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.875rem' }}>
        {!isRoot && (
          <>
            <span style={{ color: 'var(--subtle)' }}>Kira Takip</span>
            <ChevronRight size={14} strokeWidth={2} color="var(--border-s)" />
          </>
        )}
        <span style={{ color: 'var(--text)', fontWeight: 600 }}>{label}</span>
      </div>

      {/* Right side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <UserDropdown />
      </div>
    </header>
  );
}
