export type BadgeVariant = 'success' | 'warning' | 'danger' | 'neutral' | 'info';

const V: Record<BadgeVariant, { color: string; bg: string }> = {
  success: { color: 'var(--green)',   bg: 'var(--green-bg)'   },
  warning: { color: 'var(--amber)',   bg: 'var(--amber-bg)'   },
  danger:  { color: 'var(--red)',     bg: 'var(--red-bg)'     },
  neutral: { color: 'var(--gray)',    bg: 'var(--gray-bg)'    },
  info:    { color: 'var(--primary)', bg: 'var(--primary-bg)' },
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
  status?: string;        // backward-compat: derives variant + label from status string
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
      padding: '2px 10px', borderRadius: 9999,
      fontSize: '0.75rem', fontWeight: 500,
      color: s.color, background: s.bg,
      whiteSpace: 'nowrap', lineHeight: '1.6',
    }}>
      {content}
    </span>
  );
}
