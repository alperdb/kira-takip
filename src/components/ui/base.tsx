export function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: 'var(--surface)',
      borderRadius: 14,
      boxShadow: 'var(--shadow-card)',
      border: '1px solid var(--border)',
      overflow: 'hidden',
      ...style,
    }}>
      {children}
    </div>
  );
}

export function PageHeader({
  title, desc, action,
}: {
  title: string;
  desc?: string;
  action?: React.ReactNode;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
      <div>
        <h1 style={{
          fontSize: '1.375rem', fontWeight: 700, color: 'var(--text)',
          letterSpacing: '-0.02em', lineHeight: 1.2, margin: 0,
        }}>
          {title}
        </h1>
        {desc && (
          <p style={{ fontSize: '0.875rem', color: 'var(--muted)', marginTop: 4, marginBottom: 0 }}>{desc}</p>
        )}
      </div>
      {action && <div style={{ flexShrink: 0 }}>{action}</div>}
    </div>
  );
}

export function Btn({ children, onClick, variant = 'primary', disabled, style }: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'ghost' | 'outline' | 'destructive';
  disabled?: boolean;
  style?: React.CSSProperties;
}) {
  const base: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '8px 16px', borderRadius: 8,
    fontSize: '0.875rem', fontWeight: 600,
    border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'all 0.12s', opacity: disabled ? 0.5 : 1,
    ...style,
  };
  const variants: Record<string, React.CSSProperties> = {
    primary:     { background: 'var(--primary)', color: '#fff' },
    ghost:       { background: 'transparent', color: 'var(--muted)' },
    outline:     { background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)' },
    destructive: { background: 'var(--red)', color: '#fff' },
  };
  return (
    <button style={{ ...base, ...variants[variant] }} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

export function Money({
  amount, currency = '₺',
}: {
  amount: number | string | { toString(): string };
  currency?: string;
}) {
  return (
    <span style={{ fontFamily: 'ui-monospace, monospace', fontWeight: 600, color: 'var(--text)' }}>
      {currency}{Number(amount).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
    </span>
  );
}
