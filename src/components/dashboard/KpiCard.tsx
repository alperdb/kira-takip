import { Card } from '@/components/ui';

type Color = 'blue' | 'green' | 'red' | 'amber';
type Trend = 'up' | 'down' | 'neutral';

const PALETTE: Record<Color, { iconColor: string; iconBg: string; strip: string }> = {
  blue:  { iconColor: 'var(--primary)', iconBg: 'linear-gradient(135deg, rgba(59,130,246,0.22) 0%, rgba(59,130,246,0.06) 100%)',  strip: 'rgba(59,130,246,0.7)'  },
  green: { iconColor: 'var(--green)',   iconBg: 'linear-gradient(135deg, rgba(34,197,94,0.22) 0%, rgba(34,197,94,0.06) 100%)',    strip: 'rgba(34,197,94,0.7)'   },
  red:   { iconColor: 'var(--red)',     iconBg: 'linear-gradient(135deg, rgba(239,68,68,0.22) 0%, rgba(239,68,68,0.06) 100%)',    strip: 'rgba(239,68,68,0.7)'   },
  amber: { iconColor: 'var(--amber)',   iconBg: 'linear-gradient(135deg, rgba(245,158,11,0.22) 0%, rgba(245,158,11,0.06) 100%)',  strip: 'rgba(245,158,11,0.7)'  },
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
  const { iconColor, iconBg, strip } = PALETTE[color];

  return (
    <div className="kpi-card">
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {/* Üst accent strip */}
        <div style={{
          height: 3,
          background: `linear-gradient(90deg, ${strip}, transparent)`,
        }} />
        {/* İçerik */}
        <div style={{ padding: '18px 24px 20px' }}>
          {/* Top row: icon + trend badge */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10, background: iconBg,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <Icon size={16} color={iconColor} strokeWidth={2} />
            </div>
            {trend === 'up'   && <ChangeBadge dir="up" />}
            {trend === 'down' && <ChangeBadge dir="down" />}
          </div>

          {/* Big number */}
          <div style={{
            fontSize: '2rem', fontWeight: 700, letterSpacing: '-0.04em',
            color: 'var(--text)', lineHeight: 1,
            fontFamily: 'ui-monospace, monospace',
            marginBottom: 6,
          }}>
            {value}
          </div>

          {/* Muted label */}
          <div style={{
            fontSize: '0.75rem', fontWeight: 500,
            color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em',
          }}>
            {label}
          </div>

          {/* Sub / extra info — always rendered to reserve height */}
          <div style={{ fontSize: '0.75rem', color: 'var(--subtle)', marginTop: 6 }}>
            {sub ?? '\u00A0'}
          </div>
        </div>
      </Card>
    </div>
  );
}

function ChangeBadge({ dir }: { dir: 'up' | 'down' }) {
  const up = dir === 'up';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 2,
      padding: '2px 7px', borderRadius: 6,
      fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.02em',
      color:      up ? 'var(--green)' : 'var(--red)',
      background: up ? 'var(--green-bg)' : 'var(--red-bg)',
    }}>
      {up ? '↑' : '↓'}
    </span>
  );
}
