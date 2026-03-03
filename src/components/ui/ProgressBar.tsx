'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

export function ProgressBar() {
  const pathname  = usePathname();
  const prevRef   = useRef(pathname);
  const [pct, setPct]         = useState(0);
  const [visible, setVisible] = useState(false);

  // ── Start bar on any internal link click ──────────────
  useEffect(() => {
    function onLinkClick(e: MouseEvent) {
      const a    = (e.target as HTMLElement).closest('a');
      const href = a?.getAttribute('href') ?? '';
      if (!href.startsWith('/') || href === pathname) return;
      setVisible(true);
      setPct(25);
      setTimeout(() => setPct(60), 200);
      setTimeout(() => setPct(80), 700);
    }
    document.addEventListener('click', onLinkClick, true);
    return () => document.removeEventListener('click', onLinkClick, true);
  }, [pathname]);

  // ── Finish bar when pathname resolves ─────────────────
  useEffect(() => {
    if (pathname === prevRef.current) return;
    prevRef.current = pathname;
    setPct(100);
    const t = setTimeout(() => { setVisible(false); setPct(0); }, 350);
    return () => clearTimeout(t);
  }, [pathname]);

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
      height: 3, pointerEvents: 'none',
      opacity: visible ? 1 : 0,
      transition: 'opacity 0.3s ease',
    }}>
      <div style={{
        height: '100%',
        background: 'var(--primary)',
        width: `${pct}%`,
        transition: pct === 100 ? 'width 0.2s ease' : 'width 0.5s ease',
        boxShadow: '0 0 8px rgba(37,99,235,0.5)',
        borderRadius: '0 2px 2px 0',
      }} />
    </div>
  );
}
