import { Card } from '@/components/ui';

type Props = { gelir: number; gider: number };

function fmtTRY(n: number) {
  return `₺${Math.abs(n).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function Item({ label, value, color, align = 'left' }: {
  label: string;
  value: string;
  color: string;
  align?: 'left' | 'center' | 'right';
}) {
  return (
    <div style={{ textAlign: align }}>
      <p style={{
        fontSize: '0.625rem', fontWeight: 700,
        color: 'var(--subtle)', textTransform: 'uppercase',
        letterSpacing: '0.09em', marginBottom: 6,
      }}>
        {label}
      </p>
      <p style={{
        fontSize: '1.125rem', fontWeight: 700,
        color, letterSpacing: '-0.03em',
        fontFamily: 'ui-monospace, monospace',
        margin: 0,
      }}>
        {value}
      </p>
    </div>
  );
}

export function BudgetSummary({ gelir, gider }: Props) {
  const net = gelir - gider;
  return (
    <Card style={{ padding: '14px 24px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1px 1fr 1px 1fr', gap: 0, alignItems: 'center' }}>
        <Item label="Gelir" value={fmtTRY(gelir)} color="var(--green)" />
        <div style={{ background: 'var(--border)', height: 36, width: 1 }} />
        <Item label="Gider" value={fmtTRY(gider)} color="var(--red)" align="center" />
        <div style={{ background: 'var(--border)', height: 36, width: 1 }} />
        <Item
          label="Net"
          value={(net < 0 ? '−' : '') + fmtTRY(net)}
          color={net >= 0 ? 'var(--green)' : 'var(--red)'}
          align="right"
        />
      </div>
    </Card>
  );
}
