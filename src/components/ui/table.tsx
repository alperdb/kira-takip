import type { ReactNode } from 'react';

export type ColDef = { label: ReactNode; right?: boolean; center?: boolean; w?: number | string; p?: string };

export function DataTable({
  cols,
  children,
}: {
  cols: ColDef[];
  children: ReactNode;
}) {
  return (
    <div style={{ overflowX: 'auto' }}>
    <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
      <thead>
        <tr style={{ background: 'var(--surface2)', borderBottom: '1px solid var(--border)' }}>
          {cols.map((c, i) => (
            <th key={i} style={{
              padding: c.p ?? '9px 20px',
              textAlign: c.right ? 'right' : c.center ? 'center' : 'left',
              fontSize: '0.6875rem', fontWeight: 700,
              color: 'var(--muted)',
              textTransform: 'uppercase', letterSpacing: '0.07em',
              whiteSpace: 'nowrap',
              ...(c.w !== undefined ? { width: typeof c.w === 'number' ? `${c.w}px` : c.w } : {}),
            }}>
              {c.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
    </div>
  );
}

export function Td({
  children, right, center, muted, mono, action, truncate,
}: {
  children: ReactNode;
  right?: boolean;
  center?: boolean;
  muted?: boolean;
  mono?: boolean;
  action?: boolean;
  truncate?: boolean;
}) {
  return (
    <td style={{
      padding: action ? '0 16px' : '12px 20px',
      fontSize: '0.875rem',
      color: muted ? 'var(--muted)' : 'var(--text)',
      textAlign: action ? 'right' : right ? 'right' : center ? 'center' : 'left',
      fontFamily: mono ? 'ui-monospace, monospace' : 'inherit',
      whiteSpace: 'nowrap',
      verticalAlign: 'middle',
      height: action ? 52 : undefined,
      ...(truncate ? { overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 0 } : {}),
    }}>
      {children}
    </td>
  );
}

export function TRow({
  children, onClick,
}: {
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <tr
      className={`tr-hover${onClick ? ' tr-click' : ''}`}
      onClick={onClick}
      style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.08s' }}
    >
      {children}
    </tr>
  );
}

// ── Compat alias ────────────────────────────────────────

export function TableHead({ cols }: { cols: string[] }) {
  return (
    <thead>
      <tr style={{ background: 'var(--surface2)', borderBottom: '1px solid var(--border)' }}>
        {cols.map((label, i) => (
          <th key={i} style={{
            padding: '9px 20px',
            textAlign: 'left',
            fontSize: '0.6875rem', fontWeight: 700,
            color: 'var(--muted)',
            textTransform: 'uppercase', letterSpacing: '0.07em',
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
        padding: '48px 24px', textAlign: 'center',
        color: 'var(--subtle)', fontSize: '0.875rem',
      }}>
        {msg}
      </td>
    </tr>
  );
}
