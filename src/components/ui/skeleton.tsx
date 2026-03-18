export function Skeleton({ w, h = 12 }: { w?: number | string; h?: number }) {
  return (
    <div
      className="skeleton"
      style={{ width: w ?? '100%', height: h, borderRadius: 5, flexShrink: 0 }}
    />
  );
}

// Renders bare <tr> rows — must be placed inside <table><tbody>.
// Use TableSkeletonStandalone when no parent table exists.
export function TableSkeleton({ cols, rows = 5 }: { cols: number; rows?: number }) {
  const widths = [140, '65%', '55%', 60, 80];

  return (
    <>
      {Array.from({ length: rows }).map((_, ri) => (
        <tr key={ri} style={{ borderBottom: '1px solid var(--border)' }}>
          {Array.from({ length: cols }).map((_, ci) => (
            <td key={ci} style={{ padding: '12px 20px' }}>
              <Skeleton w={widths[ci % widths.length]} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

// Self-contained version for use inside a Card/div (no parent table).
export function TableSkeletonStandalone({ cols, rows = 5 }: { cols: number; rows?: number }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
        <tbody>
          <TableSkeleton cols={cols} rows={rows} />
        </tbody>
      </table>
    </div>
  );
}
