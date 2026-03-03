'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';

// ── Singleton store (no context needed) ─────────────────
export type ToastType = 'success' | 'error' | 'info';
export interface ToastItem { id: string; type: ToastType; message: string; }

type Listener = (items: ToastItem[]) => void;
const _listeners = new Set<Listener>();
let _queue: ToastItem[] = [];

function _broadcast() { _listeners.forEach(fn => fn([..._queue])); }

function _push(type: ToastType, message: string) {
  const id = `t${Date.now()}${Math.random().toString(36).slice(2, 5)}`;
  _queue = [..._queue, { id, type, message }];
  _broadcast();
  setTimeout(() => {
    _queue = _queue.filter(t => t.id !== id);
    _broadcast();
  }, 4200);
}

/** Call from anywhere: toast.success('Kaydedildi') */
export const toast = {
  success: (msg: string) => _push('success', msg),
  error:   (msg: string) => _push('error',   msg),
  info:    (msg: string) => _push('info',     msg),
};

// ── Toaster component (mount once in layout) ─────────────

const CONFIG: Record<ToastType, { icon: React.ElementType; color: string; bg: string }> = {
  success: { icon: CheckCircle2, color: 'var(--green)',   bg: 'var(--green-bg)'   },
  error:   { icon: XCircle,      color: 'var(--red)',     bg: 'var(--red-bg)'     },
  info:    { icon: Info,          color: 'var(--primary)', bg: 'var(--primary-bg)' },
};

function ToastCard({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  const cfg = CONFIG[item.type];
  const Icon = cfg.icon;
  return (
    <div
      className="toast-item"
      role="alert"
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 10,
        padding: '12px 14px', borderRadius: 12, minWidth: 280, maxWidth: 380,
        background: 'var(--surface)', border: '1px solid var(--border)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
      }}
    >
      <Icon size={16} color={cfg.color} strokeWidth={2.5} style={{ flexShrink: 0, marginTop: 1 }} />
      <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text)', flex: 1, lineHeight: 1.45 }}>
        {item.message}
      </span>
      <button
        onClick={onDismiss}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--subtle)', padding: 2, display: 'flex',
          flexShrink: 0,
        }}
      >
        <X size={14} strokeWidth={2} />
      </button>
    </div>
  );
}

export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    _listeners.add(setItems);
    return () => { _listeners.delete(setItems); };
  }, []);

  if (!items.length) return null;

  function dismiss(id: string) {
    _queue = _queue.filter(t => t.id !== id);
    _broadcast();
  }

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
