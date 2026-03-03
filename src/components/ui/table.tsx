export type ColDef = { label: string; right?: boolean; center?: boolean };

export function DataTable({
  cols,
  children,
}: {
  cols: ColDef[];
  children: React.ReactNode;
}) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr style={{ background: 'var(--surface2)', borderBottom: '2px solid var(--border)' }}>
          {cols.map((c, i) => (
            <th key={i} style={{
              padding: '10px 24px',
              textAlign: c.right ? 'right' : c.center ? 'center' : 'left',
              fontSize: '0.6875rem', fontWeight: 600,
              color: 'var(--subtle)',
              textTransform: 'uppercase', letterSpacing: '0.08em',
              whiteSpace: 'nowrap',
            }}>
              {c.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  );
}

export function Td({
  children, right, center, muted, mono,
}: {
  children: React.ReactNode;
  right?: boolean;
  center?: boolean;
  muted?: boolean;
  mono?: boolean;
}) {
  return (
    <td style={{
      padding: '14px 24px',
      fontSize: '0.875rem',
      color: muted ? 'var(--muted)' : 'var(--text)',
      textAlign: right ? 'right' : center ? 'center' : 'left',
      fontFamily: mono ? 'ui-monospace, monospace' : 'inherit',
      whiteSpace: 'nowrap',
    }}>
      {children}
    </td>
  );
}

export function TRow({
  children, onClick,
}: {
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <tr
      className={`tr-hover${onClick ? ' tr-click' : ''}`}
      onClick={onClick}
      style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.1s' }}
    >
      {children}
    </tr>
  );
}

// ── Compat alias (used by pages not yet migrated) ───────────

export function TableHead({ cols }: { cols: string[] }) {
  return (
    <thead>
      <tr style={{ background: 'var(--surface2)', borderBottom: '2px solid var(--border)' }}>
        {cols.map((label, i) => (
          <th key={i} style={{
            padding: '10px 24px',
            textAlign: 'left',
            fontSize: '0.6875rem', fontWeight: 600,
            color: 'var(--subtle)',
            textTransform: 'uppercase', letterSpacing: '0.08em',
            whiteSpace: 'nowrap',
          }}>
            {label}
          </th>
        ))}
      </tr>
    </thead>
  );
}

export function EmptyRow({ cols, msg = 'Henüz kayıt yok.' }: { cols: number; msg?: string }) {
  return (
    <tr>
      <td colSpan={cols} style={{
        padding: '40px 24px', textAlign: 'center',
        color: 'var(--subtle)', fontSize: '0.875rem',
      }}>
        {msg}
      </td>
    </tr>
  );
}
