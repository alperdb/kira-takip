'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';

// ── Types ────────────────────────────────────────────────────
export type ToastType = 'success' | 'error' | 'info';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  action?: ToastAction;
  key?: string;          // dedup: same key replaces existing toast
}

export interface ToastOptions {
  action?:   ToastAction;
  key?:      string;
  duration?: number;     // ms, default 7000
}

// ── Singleton store ──────────────────────────────────────────
type Listener = (items: ToastItem[]) => void;
const _listeners = new Set<Listener>();
let   _queue: ToastItem[] = [];
const _timers = new Map<string, ReturnType<typeof setTimeout>>();

function _broadcast() { _listeners.forEach(fn => fn([..._queue])); }

function _remove(id: string) {
  const t = _timers.get(id);
  if (t) { clearTimeout(t); _timers.delete(id); }
  _queue = _queue.filter(item => item.id !== id);
  _broadcast();
}

function _push(type: ToastType, message: string, opts?: ToastOptions) {
  const duration = opts?.duration ?? 7000;
  const key      = opts?.key;

  // Dedup: replace existing toast with same key
  if (key) {
    const existing = _queue.find(t => t.key === key);
    if (existing) _remove(existing.id);
  }

  const id: string = key ?? `t${Date.now()}${Math.random().toString(36).slice(2, 5)}`;
  const item: ToastItem = { id, type, message, action: opts?.action, key };

  _queue = [..._queue, item];
  _broadcast();

  const timer = setTimeout(() => _remove(id), duration);
  _timers.set(id, timer);
}

/** Call from anywhere — toast.success/error/info */
export const toast = {
  success: (msg: string, opts?: ToastOptions) => _push('success', msg, opts),
  error:   (msg: string, opts?: ToastOptions) => _push('error',   msg, opts),
  info:    (msg: string, opts?: ToastOptions) => _push('info',    msg, opts),
};

// ── Config ───────────────────────────────────────────────────
const CONFIG: Record<ToastType, { icon: React.ElementType; color: string }> = {
  success: { icon: CheckCircle2, color: 'var(--green)'   },
  error:   { icon: XCircle,      color: 'var(--red)'     },
  info:    { icon: Info,         color: 'var(--primary)' },
};

// ── ToastCard ────────────────────────────────────────────────
function ToastCard({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  const cfg  = CONFIG[item.type];
  const Icon = cfg.icon;

  function handleAction() {
    item.action?.onClick();
    onDismiss();
  }

  return (
    <div
      className="toast-item"
      role="alert"
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 8,
        padding: '10px 10px 10px 14px', borderRadius: 12,
        minWidth: 280, maxWidth: 520,
        background: 'var(--surface)', border: '1px solid var(--border)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
      }}
    >
      {/* Icon */}
      <Icon size={15} color={cfg.color} strokeWidth={2.5} style={{ flexShrink: 0, marginTop: 2 }} />

      {/* Message — max 2 lines */}
      <span style={{
        fontSize: '0.875rem', fontWeight: 500, color: 'var(--text)',
        flex: 1, minWidth: 0, lineHeight: 1.45,
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
      }}>
        {item.message}
      </span>

      {/* Action button */}
      {item.action && (
        <button
          onClick={handleAction}
          style={{
            padding: '3px 9px', borderRadius: 5, flexShrink: 0, alignSelf: 'flex-start',
            border: '1px solid var(--border-s)',
            background: 'transparent', color: 'var(--text)',
            fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
            whiteSpace: 'nowrap', lineHeight: 1.5,
            transition: 'border-color 0.12s, background 0.12s',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--primary)';
            (e.currentTarget as HTMLButtonElement).style.background  = 'var(--primary-bg)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-s)';
            (e.currentTarget as HTMLButtonElement).style.background  = 'transparent';
          }}
        >
          {item.action.label}
        </button>
      )}

      {/* Dismiss */}
      <button
        onClick={onDismiss}
        aria-label="Kapat"
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--subtle)', padding: 3, display: 'flex',
          flexShrink: 0, alignSelf: 'flex-start', borderRadius: 4, transition: 'color 0.1s',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--muted)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--subtle)'; }}
      >
        <X size={13} strokeWidth={2} />
      </button>
    </div>
  );
}

// ── Toaster (mount once in layout) ──────────────────────────
export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    _listeners.add(setItems);
    return () => { _listeners.delete(setItems); };
  }, []);

  if (!items.length) return null;

  function dismiss(id: string) { _remove(id); }

  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 600,
      display: 'flex', flexDirection: 'column', gap: 8,
      alignItems: 'flex-end',
    }}>
      {items.map(item => (
        <ToastCard key={item.id} item={item} onDismiss={() => dismiss(item.id)} />
      ))}
    </div>
  );
}
