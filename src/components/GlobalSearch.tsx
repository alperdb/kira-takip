'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, User, Building2, FileText } from 'lucide-react';

type Hit = { id: number; name: string; sub: string };
type Results = { tenants: Hit[]; properties: Hit[]; contracts: Hit[] };

export function GlobalSearch() {
  const router = useRouter();
  const [open,    setOpen]    = useState(false);
  const [query,   setQuery]   = useState('');
  const [results, setResults] = useState<Results | null>(null);
  const [loading, setLoading] = useState(false);
  const wrapRef  = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  // ⌘K / Ctrl+K global shortcut
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(o => !o);
      }
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
    else { setQuery(''); setResults(null); }
  }, [open]);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults(null); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      setResults(res.ok ? await res.json() : null);
    } catch { setResults(null); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => search(query), 250);
    return () => clearTimeout(t);
  }, [query, search]);

  const total = results
    ? results.tenants.length + results.properties.length + results.contracts.length
    : 0;

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      {/* Trigger */}
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            height: 32, padding: '0 10px', borderRadius: 8,
            border: '1px solid var(--border)',
            background: 'var(--surface2)', color: 'var(--muted)',
            fontSize: '0.8125rem', cursor: 'pointer',
            transition: 'border-color 0.12s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-s)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; }}
          title="Ara (⌘K)"
        >
          <Search size={13} strokeWidth={2} />
          <span>Ara...</span>
          <span style={{
            padding: '1px 5px', borderRadius: 4,
            background: 'var(--surface)', border: '1px solid var(--border)',
            fontSize: '0.625rem', fontWeight: 600, color: 'var(--subtle)',
            letterSpacing: '0.02em',
          }}>
            ⌘K
          </span>
        </button>
      ) : (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          height: 32, padding: '0 10px', borderRadius: 8,
          border: '1px solid var(--primary)',
          background: 'var(--surface2)',
          minWidth: 220,
        }}>
          <Search size={13} strokeWidth={2} color="var(--primary)" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Kiracı, bina, sözleşme..."
            style={{
              flex: 1, border: 'none', outline: 'none',
              background: 'transparent', color: 'var(--text)',
              fontSize: '0.8125rem',
            }}
          />
        </div>
      )}

      {/* Dropdown */}
      {open && query.length >= 2 && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', right: 0,
          width: 320, maxHeight: 400, overflowY: 'auto',
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 12, boxShadow: 'var(--shadow-modal)', zIndex: 200,
        }}>
          {loading ? (
            <div style={{ padding: 16, textAlign: 'center', fontSize: '0.8125rem', color: 'var(--muted)' }}>
              Aranıyor...
            </div>
          ) : total === 0 ? (
            <div style={{ padding: 16, textAlign: 'center', fontSize: '0.8125rem', color: 'var(--muted)' }}>
              Sonuç bulunamadı
            </div>
          ) : (
            <div style={{ padding: 6 }}>
              {results!.tenants.length > 0 && (
                <ResultGroup
                  label="Kiracılar" icon={User}
                  items={results!.tenants}
                  onSelect={item => go(`/tenants/${item.id}`)}
                />
              )}
              {results!.properties.length > 0 && (
                <ResultGroup
                  label="Binalar" icon={Building2}
                  items={results!.properties}
                  onSelect={() => go('/properties')}
                />
              )}
              {results!.contracts.length > 0 && (
                <ResultGroup
                  label="Sözleşmeler" icon={FileText}
                  items={results!.contracts}
                  onSelect={item => go(`/contracts/${item.id}`)}
                />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ResultGroup({ label, icon: Icon, items, onSelect }: {
  label: string;
  icon: React.ElementType;
  items: Hit[];
  onSelect: (item: Hit) => void;
}) {
  return (
    <div style={{ marginBottom: 4 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 5,
        padding: '6px 10px 4px',
        fontSize: '0.625rem', fontWeight: 700, color: 'var(--subtle)',
        textTransform: 'uppercase', letterSpacing: '0.07em',
      }}>
        <Icon size={10} />
        {label}
      </div>
      {items.map(item => (
        <button
          key={item.id}
          onClick={() => onSelect(item)}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
            width: '100%', padding: '7px 10px', borderRadius: 7,
            background: 'none', border: 'none', cursor: 'pointer',
            transition: 'background 0.1s', textAlign: 'left',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--surface2)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none'; }}
        >
          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text)' }}>
            {item.name}
          </span>
          {item.sub && (
            <span style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: 1 }}>
              {item.sub}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
