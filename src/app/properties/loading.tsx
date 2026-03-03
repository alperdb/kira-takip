import { Card } from '@/components/ui';
import { TableSkeleton } from '@/components/ui';

export default function PropertiesLoading() {
  return (
    <div>
      <div style={{ height: 54, marginBottom: 24 }} />
      <Card>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody><TableSkeleton cols={6} rows={5} /></tbody>
        </table>
      </Card>
    </div>
  );
}
