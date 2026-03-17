export function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: 'var(--surface)',
      borderRadius: 12,
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
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 16 }}>
      <div>
        <h1 style={{
          fontSize: '1.5rem', fontWeight: 800, color: 'var(--text)',
          letterSpacing: '-0.035em', lineHeight: 1.2, margin: 0,
        }}>
          {title}
        </h1>
        {desc && (
          <p style={{ fontSize: '0.8125rem', color: 'var(--muted)', marginTop: 3, marginBottom: 0, lineHeight: 1.5 }}>{desc}</p>
        )}
      </div>
      {action && <div style={{ flexShrink: 0, paddingTop: 2 }}>{action}</div>}
    </div>
  );
}

export function Btn({
  children, onClick, variant = 'primary', disabled, style, type = 'button',
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'ghost' | 'outline' | 'destructive';
  disabled?: boolean;
  style?: React.CSSProperties;
  type?: 'button' | 'submit' | 'reset';
}) {
  const base: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    padding: '7px 14px', borderRadius: 8,
    fontSize: '0.875rem', fontWeight: 600, whiteSpace: 'nowrap', lineHeight: 1.5,
    border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'background 0.12s, box-shadow 0.12s, opacity 0.12s',
    opacity: disabled ? 0.5 : 1,
    ...style,
  };
  const variants: Record<string, React.CSSProperties> = {
    primary:     { background: 'var(--primary)',  color: '#fff' },
    ghost:       { background: 'transparent',     color: 'var(--muted)' },
    outline:     { background: 'var(--surface)',  color: 'var(--text)', border: '1px solid var(--border)' },
    destructive: { background: 'var(--red)',       color: '#fff' },
  };
  return (
    <button type={type} style={{ ...base, ...variants[variant] }} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

export function Money({
  amount, currency = '₺',
}: {
  amount: number | string | { toString(): string } | null | undefined;
  currency?: string;
}) {
  const n = Number(amount);
  if (isNaN(n)) return <span style={{ color: 'var(--subtle)' }}>—</span>;
  return (
    <span style={{ fontFamily: 'ui-monospace, monospace', fontWeight: 600, color: 'var(--text)' }}>
      {currency}{n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
    </span>
  );
}
