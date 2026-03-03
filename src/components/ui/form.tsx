import React from 'react';

// Red error outline applied when hasError=true
const ERR: React.CSSProperties = {
  borderColor: 'var(--red)',
  boxShadow: '0 0 0 3px rgba(220,38,38,0.12)',
};

// ── Field wrapper ────────────────────────────────────────
// Uses global `label` styles from globals.css; adds error/hint below input

export function Field({
  label, required, error, hint, children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label>
        {label}
        {required && <span style={{ color: 'var(--red)', marginLeft: 3 }}>*</span>}
      </label>
      {children}
      {error
        ? <p style={{ margin: '5px 0 0', fontSize: '0.75rem', color: 'var(--red)' }}>{error}</p>
        : hint
        ? <p style={{ margin: '5px 0 0', fontSize: '0.75rem', color: 'var(--subtle)' }}>{hint}</p>
        : null}
    </div>
  );
}

// ── FieldRow — two inputs side by side ───────────────────

export function FieldRow({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      {children}
    </div>
  );
}

// ── SectionLabel — divider title inside a form ───────────

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      margin: '6px 0 0',
      fontSize: '0.6875rem', fontWeight: 600,
      color: 'var(--subtle)', textTransform: 'uppercase', letterSpacing: '0.07em',
    }}>
      {children}
    </p>
  );
}

// ── Alert inside a form (error / info) ───────────────────

export function FormAlert({ children, variant = 'error' }: {
  children: React.ReactNode;
  variant?: 'error' | 'info';
}) {
  const styles =
    variant === 'error'
      ? { background: 'var(--red-bg)',     color: 'var(--red)'     }
      : { background: 'var(--primary-bg)', color: 'var(--primary)' };

  return (
    <div style={{
      ...styles, borderRadius: 8, padding: '8px 12px',
      fontSize: '0.8125rem', fontWeight: 500, lineHeight: 1.5,
    }}>
      {children}
    </div>
  );
}

// ── Input components ─────────────────────────────────────
// Thin wrappers around native elements — keep global CSS focus ring.
// Extra `hasError` prop adds red border/ring.

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & { hasError?: boolean };
type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & { hasError?: boolean };

export function TextInput({ hasError, style, ...props }: InputProps) {
  return <input type="text" {...props} style={hasError ? { ...ERR, ...style } : style} />;
}

export function NumberInput({ hasError, style, ...props }: InputProps) {
  return <input type="number" min={0} {...props} style={hasError ? { ...ERR, ...style } : style} />;
}

export function DateInput({ hasError, style, ...props }: InputProps) {
  return <input type="date" {...props} style={hasError ? { ...ERR, ...style } : style} />;
}

export function Select({ hasError, style, children, ...props }: SelectProps) {
  return (
    <select {...props} style={hasError ? { ...ERR, ...style } : style}>
      {children}
    </select>
  );
}
