'use client';

import { useRef } from 'react';
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
  const mouseDownOnBackdrop = useRef(false);

  if (!open) return null;
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
      onMouseDown={e => { mouseDownOnBackdrop.current = e.target === e.currentTarget; }}
      onMouseUp={e => { if (mouseDownOnBackdrop.current && e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="modal-panel"
        style={{
          background: 'var(--surface)', borderRadius: 16,
          width: '100%', maxWidth: width,
          boxShadow: 'var(--shadow-modal)',
          border: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column',
          maxHeight: 'calc(100vh - 64px)',
          overflow: 'hidden',
        }}
        onMouseDown={e => e.stopPropagation()}
        onMouseUp={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 24px', flexShrink: 0,
          borderBottom: '1px solid var(--border)',
        }}>
          <h2 style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--text)', margin: 0, letterSpacing: '-0.01em' }}>
            {title}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--subtle)', padding: 5, borderRadius: 6,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.1s, color 0.1s', flexShrink: 0,
            }}
            onMouseEnter={e => { const el = e.currentTarget; el.style.background = 'var(--surface2)'; el.style.color = 'var(--text)'; }}
            onMouseLeave={e => { const el = e.currentTarget; el.style.background = 'none'; el.style.color = 'var(--subtle)'; }}
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function ModalBody({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      padding: '20px 24px',
      display: 'flex', flexDirection: 'column', gap: 16,
      overflowY: 'auto', overflowX: 'hidden', flex: 1,
      minWidth: 0,
      wordBreak: 'break-word',
      overflowWrap: 'break-word',
      whiteSpace: 'normal',
    }}>
      {children}
    </div>
  );
}

export function ModalFooter({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      padding: '14px 24px',
      borderTop: '1px solid var(--border)',
      display: 'flex', gap: 8, justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap',
      flexShrink: 0, background: 'var(--surface)',
    }}>
      {children}
    </div>
  );
}
