'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Btn, Card,
  Field, FieldRow, SectionLabel, FormAlert, NumberInput, DateInput,
  toast,
} from '@/components/ui';
import { RefreshCw } from 'lucide-react';

type Props = {
  contractId:    number;
  currentRent:   number;
  currentEndDate?: string; // ISO date string
};

type Step = 'form' | 'preview';

function addOneYear(dateStr: string): string {
  const d = new Date(dateStr);
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().split('T')[0];
}

export function ContractRenewForm({ contractId, currentRent, currentEndDate }: Props) {
  const router = useRouter();

  const defaultStart = currentEndDate
    ? new Date(new Date(currentEndDate).getTime() + 86400000).toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0];

  const [step,          setStep]          = useState<Step>('form');
  const [newStartDate,  setNewStartDate]  = useState(defaultStart);
  const [newEndDate,    setNewEndDate]    = useState(addOneYear(defaultStart));
  const [newRent,       setNewRent]       = useState(String(currentRent));
  const [loading,       setLoading]       = useState(false);
  const [apiError,      setApiError]      = useState('');

  const rentNum   = parseFloat(newRent) || 0;
  const canPreview = newStartDate && rentNum > 0;

  async function save() {
    setApiError('');
    setLoading(true);
    try {
      const res = await fetch(`/api/contracts/${contractId}/renew`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          newStartDate,
          newEndDate: newEndDate || null,
          newRent:    rentNum,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Yenileme başarısız');
      }
      const renewed = await res.json();
      toast.success('Sözleşme yenilendi');
      router.push(`/contracts/${renewed.id}`);
    } catch (e: unknown) {
      setApiError((e as Error).message);
      setStep('preview');
    } finally {
      setLoading(false);
    }
  }

  if (step === 'preview') {
    return (
      <Card style={{ padding: '20px 24px' }}>
        <Header subtitle="Kaydetmeden önce kontrol edin" />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
          <PreviewRow label="Yeni Başlangıç" value={new Date(newStartDate).toLocaleDateString('tr-TR')} highlight />
          {newEndDate && <PreviewRow label="Yeni Bitiş"    value={new Date(newEndDate).toLocaleDateString('tr-TR')} />}
          <PreviewRow label="Eski Kira"      value={`₺${currentRent.toLocaleString('tr-TR')}`} />
          <PreviewRow label="Yeni Kira"      value={`₺${rentNum.toLocaleString('tr-TR')}`} highlight />
        </div>

        <p style={{ fontSize: '0.8125rem', color: 'var(--muted)', marginBottom: 16 }}>
          Mevcut sözleşme kapatılacak, yeni sözleşme oluşturulacak.
        </p>

        {apiError && <div style={{ marginBottom: 12 }}><FormAlert>{apiError}</FormAlert></div>}

        <div style={{ display: 'flex', gap: 8 }}>
          <Btn variant="ghost" onClick={() => { setStep('form'); setApiError(''); }} style={{ flex: 1 }}>
            Geri Dön
          </Btn>
          <Btn onClick={save} disabled={loading} style={{ flex: 1 }}>
            {loading ? 'Yenileniyor...' : 'Onayla ve Yenile'}
          </Btn>
        </div>
      </Card>
    );
  }

  return (
    <Card style={{ padding: '20px 24px' }}>
      <Header subtitle={`Mevcut kira: ₺${currentRent.toLocaleString('tr-TR')}`} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <SectionLabel>Yeni Dönem</SectionLabel>

        <FieldRow>
          <Field label="Başlangıç Tarihi" required>
            <DateInput
              value={newStartDate}
              onChange={e => {
                setNewStartDate(e.target.value);
                if (e.target.value) setNewEndDate(addOneYear(e.target.value));
              }}
            />
          </Field>
          <Field label="Bitiş Tarihi">
            <DateInput
              value={newEndDate}
              onChange={e => setNewEndDate(e.target.value)}
            />
          </Field>
        </FieldRow>

        <Field label="Yeni Kira (₺)" required>
          <NumberInput
            value={newRent}
            onChange={e => setNewRent(e.target.value)}
            min={1}
            step={1}
          />
        </Field>

        <Btn onClick={() => setStep('preview')} disabled={!canPreview}>
          Önizle
        </Btn>
      </div>
    </Card>
  );
}

function Header({ subtitle }: { subtitle: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
      <div style={{
        width: 32, height: 32, borderRadius: 8,
        background: 'var(--primary-bg)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <RefreshCw size={15} color="var(--primary)" strokeWidth={2.5} />
      </div>
      <div>
        <p style={{ fontWeight: 600, fontSize: '0.9375rem', margin: 0, color: 'var(--text)' }}>
          Sözleşme Yenile
        </p>
        <p style={{ fontSize: '0.8125rem', color: 'var(--muted)', margin: 0 }}>{subtitle}</p>
      </div>
    </div>
  );
}

function PreviewRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '8px 12px', borderRadius: 8,
      background: highlight ? 'var(--primary-bg)' : 'var(--surface2)',
    }}>
      <span style={{ fontSize: '0.8125rem', color: 'var(--muted)' }}>{label}</span>
      <span style={{
        fontSize: '0.875rem', fontWeight: highlight ? 700 : 500,
        color: highlight ? 'var(--primary)' : 'var(--text)',
        fontFamily: 'ui-monospace, monospace',
      }}>
        {value}
      </span>
    </div>
  );
}
