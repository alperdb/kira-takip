import { Settings } from 'lucide-react';
import { Card, PageHeader } from '@/components/ui';

export default function SettingsPage() {
  return (
    <>
      <PageHeader
        title="Ayarlar"
        desc="Uygulama ve hesap ayarları"
      />
      <Card>
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', padding: '64px 24px', gap: 12,
          color: 'var(--subtle)',
        }}>
          <Settings size={40} strokeWidth={1.5} />
          <p style={{ fontSize: '0.9375rem', fontWeight: 500 }}>Ayarlar yakında eklenecek</p>
        </div>
      </Card>
    </>
  );
}
