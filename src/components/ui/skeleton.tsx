export function Skeleton({ w, h = 12 }: { w?: number | string; h?: number }) {
  return (
    <div
      className="skeleton"
      style={{ width: w ?? '100%', height: h, borderRadius: 5, flexShrink: 0 }}
    />
  );
}

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
