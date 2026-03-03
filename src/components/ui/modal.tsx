'use client';

import { X } from 'lucide-react';

export function Modal({
  open, onClose, title, children, width = 500,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  width?: number;
}) {
  if (!open) return null;
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--surface)', borderRadius: 20,
          width: '100%', maxWidth: width,
          boxShadow: 'var(--shadow-modal)',
          border: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column',
          maxHeight: 'calc(100vh - 64px)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px', flexShrink: 0,
        }}>
          <h2 style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text)', margin: 0 }}>
            {title}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--subtle)', padding: 4, borderRadius: 6,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'color 0.1s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--muted)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--subtle)'; }}
          >
            <X size={18} />
          </button>
        </div>
        <div style={{ height: 1, background: 'var(--border)', flexShrink: 0 }} />
        {children}
      </div>
    </div>
  );
}

export function ModalBody({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      padding: '20px 24px',
      display: 'flex', flexDirection: 'column', gap: 14,
      overflowY: 'auto', flex: 1,
    }}>
      {children}
    </div>
  );
}

export function ModalFooter({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      padding: '16px 24px',
      borderTop: '1px solid var(--border)',
      display: 'flex', gap: 8, justifyContent: 'flex-end',
      flexShrink: 0,
    }}>
      {children}
    </div>
  );
}
