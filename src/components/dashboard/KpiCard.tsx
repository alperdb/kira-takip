import { Card } from '@/components/ui';

type Color = 'blue' | 'green' | 'red' | 'amber';
type Trend = 'up' | 'down' | 'neutral';

const PALETTE: Record<Color, { iconColor: string; iconBg: string; strip: string }> = {
  blue:  { iconColor: 'var(--primary)', iconBg: 'linear-gradient(135deg, rgba(79,140,255,0.2) 0%, rgba(79,140,255,0.06) 100%)',   strip: 'rgba(79,140,255,0.8)'  },
  green: { iconColor: 'var(--green)',   iconBg: 'linear-gradient(135deg, rgba(48,209,88,0.2) 0%, rgba(48,209,88,0.06) 100%)',     strip: 'rgba(48,209,88,0.8)'   },
  red:   { iconColor: 'var(--red)',     iconBg: 'linear-gradient(135deg, rgba(255,69,58,0.2) 0%, rgba(255,69,58,0.06) 100%)',     strip: 'rgba(255,69,58,0.8)'   },
  amber: { iconColor: 'var(--amber)',   iconBg: 'linear-gradient(135deg, rgba(255,214,10,0.2) 0%, rgba(255,214,10,0.06) 100%)',   strip: 'rgba(255,214,10,0.8)'  },
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
          height: 2,
          background: `linear-gradient(90deg, ${strip}, transparent)`,
        }} />
        {/* İçerik */}
        <div style={{ padding: '20px 24px 22px' }}>
          {/* Top row: icon + trend badge */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10, background: iconBg,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <Icon size={18} color={iconColor} strokeWidth={2} />
            </div>
            {trend === 'up'   && <ChangeBadge dir="up" />}
            {trend === 'down' && <ChangeBadge dir="down" />}
          </div>

          {/* Big number */}
          <div style={{
            fontSize: '2.25rem', fontWeight: 800, letterSpacing: '-0.05em',
            color: 'var(--text)', lineHeight: 1,
            fontFamily: 'ui-monospace, monospace',
            marginBottom: 8,
          }}>
            {value}
          </div>

          {/* Muted label */}
          <div style={{
            fontSize: '0.625rem', fontWeight: 700,
            color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.09em',
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
