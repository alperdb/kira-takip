import React from 'react';

// Red error outline applied when hasError=true
const ERR: React.CSSProperties = {
  borderColor: 'var(--red)',
  boxShadow: '0 0 0 3px rgba(220,38,38,0.12)',
};

// ── Field wrapper ────────────────────────────────────────
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
        ? <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: 'var(--red)', lineHeight: 1.4 }}>{error}</p>
        : hint
        ? <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: 'var(--subtle)', lineHeight: 1.4 }}>{hint}</p>
        : null}
    </div>
  );
}

// ── FieldRow — two inputs side by side ───────────────────
export function FieldRow({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
      {children}
    </div>
  );
}

// ── SectionLabel — divider title inside a form ───────────
export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      margin: '8px 0 0',
      fontSize: '0.6875rem', fontWeight: 700,
      color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em',
      paddingBottom: 4, borderBottom: '1px solid var(--border)',
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
  const isError = variant === 'error';
  return (
    <div style={{
      background: isError ? 'var(--red-bg)'     : 'var(--primary-bg)',
      color:      isError ? 'var(--red)'         : 'var(--primary)',
      borderLeft: `3px solid ${isError ? 'var(--red)' : 'var(--primary)'}`,
      borderRadius: '0 8px 8px 0',
      padding: '9px 13px',
      fontSize: '0.8125rem', fontWeight: 500, lineHeight: 1.5,
    }}>
      {children}
    </div>
  );
}

// ── Input components ─────────────────────────────────────
type InputProps  = React.InputHTMLAttributes<HTMLInputElement>   & { hasError?: boolean };
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
