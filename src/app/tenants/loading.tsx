import { Card } from '@/components/ui';
import { TableSkeleton } from '@/components/ui';

export default function TenantsLoading() {
  return (
    <div>
      <div style={{ height: 54, marginBottom: 24 }} />
      <Card>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody><TableSkeleton cols={5} rows={6} /></tbody>
        </table>
      </Card>
    </div>
  );
}
