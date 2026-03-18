import { Card, TableSkeletonStandalone } from '@/components/ui';

export default function TenantsLoading() {
  return (
    <div>
      <div style={{ height: 54, marginBottom: 24 }} />
      <Card>
        <TableSkeletonStandalone cols={5} rows={6} />
      </Card>
    </div>
  );
}
