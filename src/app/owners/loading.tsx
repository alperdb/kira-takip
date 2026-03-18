import { Card, TableSkeletonStandalone } from '@/components/ui';

export default function OwnersLoading() {
  return (
    <div>
      {/* PageHeader placeholder — same height as real header */}
      <div style={{ height: 54, marginBottom: 24 }} />
      <Card>
        <TableSkeletonStandalone cols={5} rows={6} />
      </Card>
    </div>
  );
}
