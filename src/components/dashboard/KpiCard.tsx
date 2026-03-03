import { Card } from '@/components/ui';

type Color = 'blue' | 'green' | 'red' | 'amber';
type Trend = 'up' | 'down' | 'neutral';

const PALETTE: Record<Color, { iconColor: string; iconBg: string }> = {
  blue:  { iconColor: 'var(--primary)', iconBg: 'var(--primary-bg)' },
  green: { iconColor: 'var(--green)',   iconBg: 'var(--green-bg)'   },
  red:   { iconColor: 'var(--red)',     iconBg: 'var(--red-bg)'     },
  amber: { iconColor: 'var(--amber)',   iconBg: 'var(--amber-bg)'   },
};

export function KpiCard({
  icon: Icon, label, value, sub, trend, color = 'blue',
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  trend?: Trend;
  color?: Color;
}) {
  const { iconColor, iconBg } = PALETTE[color];
  return (
    <div className="kpi-card">
      <Card style={{ padding: '20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10, background: iconBg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon size={18} color={iconColor} strokeWidth={2} />
          </div>
          {trend === 'up'   && <TrendPill dir="up" />}
          {trend === 'down' && <TrendPill dir="down" />}
        </div>

        <div style={{
          fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.03em',
          color: 'var(--text)', marginBottom: 4,
          fontFamily: 'ui-monospace, monospace', lineHeight: 1,
        }}>
          {value}
        </div>
        <div style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--muted)' }}>{label}</div>
        {sub && <div style={{ fontSize: '0.75rem', color: 'var(--subtle)', marginTop: 4 }}>{sub}</div>}
      </Card>
    </div>
  );
}

function TrendPill({ dir }: { dir: 'up' | 'down' }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 8px', borderRadius: 9999,
      fontSize: '0.6875rem', fontWeight: 600,
      color: dir === 'up' ? 'var(--green)' : 'var(--red)',
      background: dir === 'up' ? 'var(--green-bg)' : 'var(--red-bg)',
    }}>
      {dir === 'up' ? '↑' : '↓'}
    </span>
  );
}
