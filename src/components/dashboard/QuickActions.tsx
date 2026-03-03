'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw, Clock, Check } from 'lucide-react';
import { Card } from '@/components/ui';

export function QuickActions() {
  const [gen, setGen] = useState<'idle' | 'loading' | 'done'>('idle');
  const [upd, setUpd] = useState<'idle' | 'loading' | 'done'>('idle');
  const router = useRouter();

  async function generate() {
    setGen('loading');
    await fetch('/api/charges?action=generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: new Date().toISOString() }),
    });
    setGen('done');
    router.refresh();
    setTimeout(() => setGen('idle'), 2500);
  }

  async function updateOverdue() {
    setUpd('loading');
    await fetch('/api/charges?action=update-overdue', { method: 'POST' });
    setUpd('done');
    router.refresh();
    setTimeout(() => setUpd('idle'), 2500);
  }

  return (
    <Card style={{ padding: 20 }}>
      <p style={{
        fontSize: '0.6875rem', fontWeight: 600, color: 'var(--subtle)',
        textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 14px',
      }}>
        Hızlı İşlemler
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <ActionButton
          icon={RefreshCw}
          label="Alacak Oluştur"
          hint="Bu ayın kira alacaklarını oluştur"
          state={gen}
          spin={gen === 'loading'}
          onClick={generate}
        />
        <ActionButton
          icon={Clock}
          label="Gecikmeleri Güncelle"
          hint="Vadesi geçen alacakları işaretle"
          state={upd}
          onClick={updateOverdue}
        />
      </div>

      <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
        <p style={{ fontSize: '0.75rem', color: 'var(--subtle)', margin: 0, lineHeight: 1.5 }}>
          Alacak oluşturma idempotent'tir — aynı ay için birden fazla çalıştırılabilir.
        </p>
      </div>
    </Card>
  );
}

function ActionButton({
  icon: Icon, label, hint, state, spin, onClick,
}: {
  icon: React.ElementType;
  label: string;
  hint: string;
  state: 'idle' | 'loading' | 'done';
  spin?: boolean;
  onClick: () => void;
}) {
  const done    = state === 'done';
  const loading = state === 'loading';

  return (
    <button
      onClick={onClick}
      disabled={loading}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 10,
        padding: '12px 14px', borderRadius: 10, width: '100%',
        background: done ? 'var(--green-bg)' : 'var(--surface2)',
        border: `1px solid ${done ? 'rgba(22,163,74,0.2)' : 'var(--border)'}`,
        color: done ? 'var(--green)' : 'var(--text)',
        cursor: loading ? 'not-allowed' : 'pointer',
        opacity: loading ? 0.7 : 1,
        transition: 'all 0.15s',
        textAlign: 'left',
      }}
    >
      <div style={{
        width: 32, height: 32, borderRadius: 8, flexShrink: 0, marginTop: 1,
        background: done ? 'rgba(22,163,74,0.12)' : 'var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {done
          ? <Check size={14} color="var(--green)" strokeWidth={2.5} />
          : <Icon
              size={14}
              strokeWidth={2}
              style={spin ? { animation: 'spin 1s linear infinite' } : undefined}
            />
        }
      </div>
      <div>
        <div style={{ fontSize: '0.875rem', fontWeight: 600, lineHeight: 1.3 }}>
          {done ? 'Tamamlandı!' : loading ? `${label}...` : label}
        </div>
        <div style={{ fontSize: '0.75rem', color: done ? 'var(--green)' : 'var(--subtle)', marginTop: 2 }}>
          {hint}
        </div>
      </div>
    </button>
  );
}
