export type BadgeVariant = 'success' | 'warning' | 'danger' | 'neutral' | 'info';

const V: Record<BadgeVariant, { color: string; bg: string; border: string }> = {
  success: { color: 'var(--green)',   bg: 'var(--green-bg)',   border: 'rgba(48,209,88,0.25)'   },
  warning: { color: 'var(--amber)',   bg: 'var(--amber-bg)',   border: 'rgba(255,214,10,0.2)'   },
  danger:  { color: 'var(--red)',     bg: 'var(--red-bg)',     border: 'rgba(255,69,58,0.25)'   },
  neutral: { color: 'var(--muted)',   bg: 'var(--gray-bg)',    border: 'transparent'            },
  info:    { color: 'var(--primary)', bg: 'var(--primary-bg)', border: 'rgba(79,140,255,0.25)'  },
};

// Status string → variant + label
const STATUS_MAP: Record<string, { variant: BadgeVariant; label: string }> = {
  active:      { variant: 'success', label: 'Aktif'          },
  paid:        { variant: 'success', label: 'Ödendi'         },
  occupied:    { variant: 'success', label: 'Dolu'           },
  partial:     { variant: 'warning', label: 'Kısmi'          },
  maintenance: { variant: 'warning', label: 'Bakımda'        },
  overdue:     { variant: 'danger',  label: 'Gecikti'        },
  terminated:  { variant: 'danger',  label: 'Sonlandırıldı'  },
  pending:     { variant: 'neutral', label: 'Bekliyor'       },
  vacant:      { variant: 'neutral', label: 'Boş'            },
  expired:     { variant: 'neutral', label: 'Sona Erdi'      },
  waived:      { variant: 'neutral', label: 'İptal'          },
};

export function Badge({
  variant,
  status,
  children,
}: {
  variant?: BadgeVariant;
  status?: string;
  children?: React.ReactNode;
}) {
  let resolvedVariant: BadgeVariant = variant ?? 'neutral';
  let content = children;

  if (status) {
    const mapped = STATUS_MAP[status];
    resolvedVariant = mapped?.variant ?? 'neutral';
    content = children ?? mapped?.label ?? status;
  }

  const s = V[resolvedVariant];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 9px', borderRadius: 9999,
      fontSize: '0.6875rem', fontWeight: 600,
      letterSpacing: '0.01em',
      color: s.color, background: s.bg,
      border: `1px solid ${s.border}`,
      whiteSpace: 'nowrap', lineHeight: '1.6',
    }}>
      {content}
    </span>
  );
}
