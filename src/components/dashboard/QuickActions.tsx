'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import {
  RefreshCw, Clock, Check, Plus, Settings,
  UserCheck, DoorOpen, FileText, Building2, Users,
  Eye, EyeOff, ChevronUp, ChevronDown, SlidersHorizontal,
  CreditCard, BarChart2,
} from 'lucide-react';
import { Card } from '@/components/ui';

// ── Nav menu items ──────────────────────────────────────────
const NAV_ITEMS = [
  { label: 'Sözleşme Ekle', icon: FileText,  href: '/contracts'  },
  { label: 'Kiracı Ekle',   icon: UserCheck, href: '/tenants'    },
  { label: 'Daire Ekle',    icon: DoorOpen,  href: '/units'      },
  { label: 'Bina Ekle',     icon: Building2, href: '/properties' },
  { label: 'Sahip Ekle',    icon: Users,     href: '/owners'     },
];

// ── Action definitions ──────────────────────────────────────
type ActionDef = {
  id: string;
  icon: React.ElementType;
  label: string;
  hint: string;
  spin?: boolean;
};

const ACTION_DEFS: ActionDef[] = [
  {
    id: 'generate', icon: RefreshCw, spin: true,
    label: 'Alacak Oluştur',
    hint:  'Aktif sözleşmeler için bu ayın alacaklarını oluşturur.',
  },
  {
    id: 'overdue', icon: Clock,
    label: 'Gecikmeleri Güncelle',
    hint:  'Vadesi geçen alacakları gecikmiş olarak işaretler.',
  },
];

// ── Config persistence ──────────────────────────────────────
const LS_KEY = 'quick-actions-config';
type ActionConfig = { id: string; visible: boolean };

function loadConfig(): ActionConfig[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const saved: ActionConfig[] = JSON.parse(raw);
      const valid   = saved.filter(c => ACTION_DEFS.some(d => d.id === c.id));
      const missing = ACTION_DEFS
        .filter(d => !valid.some(c => c.id === d.id))
        .map(d => ({ id: d.id, visible: true }));
      return [...valid, ...missing];
    }
  } catch { /* ignore */ }
  return ACTION_DEFS.map(d => ({ id: d.id, visible: true }));
}

// ── Component ───────────────────────────────────────────────
export function QuickActions({ charged = 0, paid = 0 }: { charged?: number; paid?: number }) {
  const router = useRouter();

  const [gen, setGen] = useState<'idle' | 'loading' | 'done'>('idle');
  const [upd, setUpd] = useState<'idle' | 'loading' | 'done'>('idle');

  const [config, setConfig] = useState<ActionConfig[]>(
    () => ACTION_DEFS.map(d => ({ id: d.id, visible: true })),
  );
  useEffect(() => { setConfig(loadConfig()); }, []);

  type MiniRates = { USD: number; EUR: number } | null;
  const [miniRates, setMiniRates] = useState<MiniRates>(null);

  useEffect(() => {
    fetch('/api/exchange-rates')
      .then(r => r.ok ? r.json() : null)
      .then((d: { USD?: { buying: number }; EUR?: { buying: number } } | null) => {
        if (d?.USD && d?.EUR) {
          setMiniRates({ USD: d.USD.buying, EUR: d.EUR.buying });
        }
      })
      .catch(() => {});
  }, []);

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!menuOpen) return;
    function handle(e: MouseEvent) {
      if (e.button !== 0) return;
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [menuOpen]);

  const [editMode, setEditMode] = useState(false);
  const [draft, setDraft] = useState<ActionConfig[]>([]);

  function openEdit() {
    setMenuOpen(false);
    setDraft(config.map(c => ({ ...c })));
    setEditMode(true);
  }
  function saveEdit() {
    setConfig(draft);
    localStorage.setItem(LS_KEY, JSON.stringify(draft));
    setEditMode(false);
  }
  function cancelEdit() { setEditMode(false); }
  function toggleVisible(i: number) {
    setDraft(d => d.map((c, idx) => idx === i ? { ...c, visible: !c.visible } : c));
  }
  function moveItem(i: number, dir: -1 | 1) {
    setDraft(d => {
      const next = [...d];
      const j = i + dir;
      if (j < 0 || j >= next.length) return d;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  const handlers: Record<string, () => void> = {
    generate: async () => {
      setGen('loading');
      await fetch('/api/charges?action=generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: new Date().toISOString() }),
      });
      setGen('done');
      router.refresh();
      setTimeout(() => setGen('idle'), 2500);
    },
    overdue: async () => {
      setUpd('loading');
      await fetch('/api/charges?action=update-overdue', { method: 'POST' });
      setUpd('done');
      router.refresh();
      setTimeout(() => setUpd('idle'), 2500);
    },
  };

  const stateMap: Record<string, 'idle' | 'loading' | 'done'> = {
    generate: gen, overdue: upd,
  };

  const visibleActions = config
    .filter(c => c.visible)
    .map(c => ACTION_DEFS.find(d => d.id === c.id)!)
    .filter(Boolean);

  return (
    <Card style={{ padding: 20 }}>
      {/* ── Header ─────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <p style={{
          fontSize: '0.6875rem', fontWeight: 600, color: 'var(--subtle)',
          textTransform: 'uppercase', letterSpacing: '0.07em', margin: 0,
        }}>
          {editMode ? 'Hızlı İşlemleri Düzenle' : 'Hızlı İşlemler'}
        </p>

        {!editMode && (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <button
              onClick={() => router.push('/contracts')}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border)',
                background: 'transparent', color: 'var(--text)',
                fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                transition: 'all 0.12s',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--primary)';
                (e.currentTarget as HTMLButtonElement).style.color = 'var(--primary)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)';
                (e.currentTarget as HTMLButtonElement).style.color = 'var(--text)';
              }}
            >
              <Plus size={11} strokeWidth={2.5} />
              Sözleşme Ekle
            </button>

            <div ref={menuRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setMenuOpen(o => !o)}
                aria-label="Hızlı ekle menüsü"
                style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: 28, height: 28, borderRadius: 6,
                  border: '1px solid var(--border)',
                  background: menuOpen ? 'var(--primary-bg)' : 'transparent',
                  color: menuOpen ? 'var(--primary)' : 'var(--muted)',
                  cursor: 'pointer', transition: 'all 0.12s',
                }}
                onMouseEnter={e => {
                  if (!menuOpen) {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--primary)';
                    (e.currentTarget as HTMLButtonElement).style.color = 'var(--primary)';
                  }
                }}
                onMouseLeave={e => {
                  if (!menuOpen) {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)';
                    (e.currentTarget as HTMLButtonElement).style.color = 'var(--muted)';
                  }
                }}
              >
                <Settings size={13} strokeWidth={2} />
              </button>

              {menuOpen && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 6px)', right: 0,
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: 10, padding: '4px',
                  boxShadow: 'var(--shadow-modal)',
                  minWidth: 180, zIndex: 100,
                }}>
                  {NAV_ITEMS.map(({ label, icon: Icon, href }) => (
                    <button
                      key={href}
                      onClick={() => { setMenuOpen(false); router.push(href); }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 9,
                        width: '100%', padding: '8px 10px', borderRadius: 7,
                        border: 'none', background: 'transparent',
                        color: 'var(--text)', fontSize: '0.8125rem', fontWeight: 500,
                        cursor: 'pointer', textAlign: 'left', transition: 'background 0.1s',
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface2)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                    >
                      <Icon size={13} strokeWidth={2} color="var(--muted)" />
                      {label}
                    </button>
                  ))}
                  <div style={{ height: 1, background: 'var(--border)', margin: '4px 2px' }} />
                  <button
                    onClick={openEdit}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 9,
                      width: '100%', padding: '8px 10px', borderRadius: 7,
                      border: 'none', background: 'transparent',
                      color: 'var(--muted)', fontSize: '0.8125rem', fontWeight: 500,
                      cursor: 'pointer', textAlign: 'left', transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface2)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                  >
                    <SlidersHorizontal size={13} strokeWidth={2} />
                    Hızlı İşlemleri Düzenle
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Edit mode ──────────────────────────────── */}
      {editMode ? (
        <div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 14 }}>
            {draft.map((item, i) => {
              const def = ACTION_DEFS.find(d => d.id === item.id)!;
              return (
                <div key={item.id} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '9px 10px', borderRadius: 8,
                  background: 'var(--surface2)', border: '1px solid var(--border)',
                  opacity: item.visible ? 1 : 0.45, transition: 'opacity 0.15s',
                }}>
                  <def.icon size={14} color="var(--subtle)" style={{ flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: '0.875rem', fontWeight: 600, color: 'var(--text)' }}>
                    {def.label}
                  </span>
                  {(['up', 'down'] as const).map(dir => {
                    const isUp = dir === 'up';
                    const disabled = isUp ? i === 0 : i === draft.length - 1;
                    const Icon = isUp ? ChevronUp : ChevronDown;
                    return (
                      <button key={dir}
                        onClick={() => moveItem(i, isUp ? -1 : 1)}
                        disabled={disabled}
                        aria-label={isUp ? 'Yukarı taşı' : 'Aşağı taşı'}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          width: 24, height: 24, borderRadius: 5, border: 'none',
                          background: 'transparent', color: 'var(--subtle)',
                          cursor: disabled ? 'not-allowed' : 'pointer',
                          opacity: disabled ? 0.3 : 1, transition: 'all 0.1s',
                        }}
                        onMouseEnter={e => { if (!disabled) (e.currentTarget as HTMLButtonElement).style.background = 'var(--border)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                      >
                        <Icon size={14} />
                      </button>
                    );
                  })}
                  <button
                    onClick={() => toggleVisible(i)}
                    aria-label={item.visible ? 'Gizle' : 'Göster'}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      width: 24, height: 24, borderRadius: 5, border: 'none',
                      background: 'transparent',
                      color: item.visible ? 'var(--primary)' : 'var(--subtle)',
                      cursor: 'pointer', transition: 'all 0.1s',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--border)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                  >
                    {item.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                  </button>
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={saveEdit} style={{
              flex: 1, padding: '7px 0', borderRadius: 7,
              border: 'none', background: 'var(--primary)', color: '#fff',
              fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer',
              transition: 'opacity 0.12s',
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.85'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
            >Kaydet</button>
            <button onClick={cancelEdit} style={{
              flex: 1, padding: '7px 0', borderRadius: 7,
              border: '1px solid var(--border)', background: 'transparent',
              color: 'var(--muted)', fontSize: '0.8125rem', fontWeight: 600,
              cursor: 'pointer', transition: 'background 0.12s',
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface2)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
            >İptal</button>
          </div>
        </div>
      ) : (
        <>
          {/* ── Action buttons ─────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {visibleActions.length === 0 ? (
              <p style={{ fontSize: '0.8125rem', color: 'var(--subtle)', margin: 0, padding: '4px 0' }}>
                Tüm butonlar gizlendi. Ayarlardan tekrar etkinleştirebilirsiniz.
              </p>
            ) : visibleActions.map(def => (
              <ActionButton
                key={def.id}
                icon={def.icon}
                label={def.label}
                hint={def.hint}
                state={stateMap[def.id] ?? 'idle'}
                spin={def.spin && stateMap[def.id] === 'loading'}
                onClick={handlers[def.id]}
              />
            ))}
          </div>

          {/* ── Separator ─────────────────────────── */}
          <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />

          {/* ── Mini bilgi panelleri ─────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>

            {/* Bu Ay Özeti */}
            <div style={{
              padding: '10px 12px', borderRadius: 10,
              background: 'var(--surface2)', border: '1px solid var(--border)',
            }}>
              <p style={{
                fontSize: '0.625rem', fontWeight: 600, color: 'var(--subtle)',
                textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 6px',
              }}>
                Bu Ay
              </p>
              <p style={{
                fontSize: '0.8125rem', fontWeight: 700, color: 'var(--green)',
                fontFamily: 'ui-monospace, monospace', margin: '0 0 2px', letterSpacing: '-0.02em',
              }}>
                ₺{paid.toLocaleString('tr-TR')}
              </p>
              <p style={{ fontSize: '0.6875rem', color: 'var(--subtle)', margin: 0 }}>
                ₺{charged.toLocaleString('tr-TR')} alacak
              </p>
              {charged - paid === 0 && (
                <p style={{ fontSize: '0.6875rem', color: 'var(--green)', margin: '4px 0 0' }}>
                  Bu ay alacak kalmadı.
                </p>
              )}
            </div>

            {/* Güncel Kurlar */}
            <div style={{
              padding: '10px 12px', borderRadius: 10,
              background: 'var(--surface2)', border: '1px solid var(--border)',
            }}>
              <p style={{
                fontSize: '0.625rem', fontWeight: 600, color: 'var(--subtle)',
                textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 6px',
              }}>
                Kurlar
              </p>
              {miniRates ? (
                <>
                  <p style={{
                    fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text)',
                    fontFamily: 'ui-monospace, monospace', margin: '0 0 2px', letterSpacing: '-0.02em',
                  }}>
                    ₺{miniRates.USD.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <p style={{ fontSize: '0.6875rem', color: 'var(--subtle)', margin: 0 }}>
                    EUR ₺{miniRates.EUR.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </>
              ) : (
                <p style={{ fontSize: '0.75rem', color: 'var(--subtle)', margin: 0 }}>—</p>
              )}
            </div>
          </div>

          {/* ── Alt aksiyon butonları ─────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <SecondaryBtn icon={BarChart2}  label="Rapor"    onClick={() => router.push('/charges?status=overdue')} />
            <SecondaryBtn icon={CreditCard} label="Tahsilat" onClick={() => router.push('/charges')} />
          </div>
        </>
      )}
    </Card>
  );
}

// ── ActionButton ─────────────────────────────────────────────
function ActionButton({
  icon: Icon, label, hint, state, spin, onClick,
}: {
  icon: React.ElementType;
  label: string;
  hint: string;
  state: 'idle' | 'loading' | 'done';
  spin?: boolean;
  onClick: () => void;
}) {
  const done    = state === 'done';
  const loading = state === 'loading';
  const btnRef  = useRef<HTMLButtonElement>(null);
  const [tip, setTip]     = useState(false);
  const [tipX, setTipX]   = useState(0);
  const [tipY, setTipY]   = useState(0);
  const [mounted, setMounted] = useState<boolean>(false);
  useEffect(() => { setMounted(true); }, []);

  function handleMouseEnter() {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setTipX(r.left + r.width / 2);
      setTipY(r.top);
    }
    setTip(true);
  }

  return (
    <>
      {/* Fixed tooltip — escapes all overflow/stacking contexts */}
      {mounted && tip && !loading && !done && createPortal(
        <div style={{
          position: 'fixed',
          top: tipY,
          left: tipX,
          transform: 'translateX(-50%) translateY(calc(-100% - 8px))',
          zIndex: 9999,
          pointerEvents: 'none',
          background: 'var(--text)', color: 'var(--surface)',
          padding: '6px 10px', borderRadius: 6,
          fontSize: '0.75rem', lineHeight: 1.5,
          whiteSpace: 'normal', width: 'max-content', maxWidth: 220,
          textAlign: 'center',
          boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
        }}>
          {hint}
        </div>,
        document.body
      )}

      <button
        ref={btnRef}
        onClick={onClick}
        disabled={loading}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setTip(false)}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 14px', borderRadius: 10, width: '100%',
          background: done ? 'var(--green-bg)' : 'var(--surface2)',
          border: `1px solid ${done ? 'rgba(34,197,94,0.2)' : 'var(--border)'}`,
          color: done ? 'var(--green)' : 'var(--text)',
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.7 : 1,
          transition: 'all 0.15s', textAlign: 'left',
        }}
      >
        <div style={{
          width: 32, height: 32, borderRadius: 8, flexShrink: 0,
          background: done ? 'rgba(34,197,94,0.12)' : 'var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {done
            ? <Check size={14} color="var(--green)" strokeWidth={2.5} />
            : <Icon size={14} strokeWidth={2}
                style={spin ? { animation: 'spin 1s linear infinite' } : undefined} />
          }
        </div>
        <div style={{ fontSize: '0.875rem', fontWeight: 600, lineHeight: 1.3 }}>
          {done ? 'Tamamlandı!' : loading ? `${label}...` : label}
        </div>
      </button>
    </>
  );
}

// ── SecondaryBtn ──────────────────────────────────────────────
function SecondaryBtn({
  icon: Icon, label, onClick,
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        padding: '8px 10px', borderRadius: 8, width: '100%',
        border: '1px solid var(--border)', background: 'transparent',
        color: 'var(--muted)', fontSize: '0.8125rem', fontWeight: 500,
        cursor: 'pointer', transition: 'all 0.12s',
      }}
      onMouseEnter={e => {
        const b = e.currentTarget as HTMLButtonElement;
        b.style.borderColor = 'var(--primary)';
        b.style.color = 'var(--primary)';
        b.style.background = 'var(--primary-bg)';
      }}
      onMouseLeave={e => {
        const b = e.currentTarget as HTMLButtonElement;
        b.style.borderColor = 'var(--border)';
        b.style.color = 'var(--muted)';
        b.style.background = 'transparent';
      }}
    >
      <Icon size={13} strokeWidth={2} />
      {label}
    </button>
  );
}
