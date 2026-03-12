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
      padding: '56px 24px', gap: 10,
    }}>
      {Icon && (
        <div style={{
          width: 48, height: 48, borderRadius: 12,
          background: 'var(--surface2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 4,
        }}>
          <Icon size={22} strokeWidth={1.5} color="var(--subtle)" />
        </div>
      )}
      <p style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--muted)', margin: 0 }}>{title}</p>
      {desc && (
        <p style={{ fontSize: '0.875rem', color: 'var(--subtle)', maxWidth: 320, textAlign: 'center', margin: 0 }}>
          {desc}
        </p>
      )}
      {action && <div style={{ marginTop: 4 }}>{action}</div>}
    </div>
  );
}
