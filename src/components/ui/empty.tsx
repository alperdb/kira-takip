export function EmptyState({
  icon: Icon,
  title,
  desc,
  action,
}: {
  icon?: React.ElementType;
  title: string;
  desc?: string;
  action?: React.ReactNode;
}) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '52px 24px', gap: 10,
    }}>
      {Icon && (
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: 'var(--surface2)',
          border: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 2,
        }}>
          <Icon size={20} strokeWidth={1.5} color="var(--subtle)" />
        </div>
      )}
      <p style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text)', margin: 0 }}>{title}</p>
      {desc && (
        <p style={{ fontSize: '0.8125rem', color: 'var(--muted)', maxWidth: 300, textAlign: 'center', margin: 0, lineHeight: 1.55 }}>
          {desc}
        </p>
      )}
      {action && <div style={{ marginTop: 8 }}>{action}</div>}
    </div>
  );
}
