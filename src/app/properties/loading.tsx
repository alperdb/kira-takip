import { Card, TableSkeletonStandalone } from '@/components/ui';

export default function PropertiesLoading() {
  return (
    <div>
      <div style={{ height: 54, marginBottom: 24 }} />
      <Card>
        <TableSkeletonStandalone cols={6} rows={5} />
      </Card>
    </div>
  );
}
