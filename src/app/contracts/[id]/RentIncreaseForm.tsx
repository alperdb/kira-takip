'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Btn, Card,
  Field, FieldRow, SectionLabel, FormAlert, Select, NumberInput, DateInput,
  toast,
} from '@/components/ui';
import { TrendingUp } from 'lucide-react';
import { calcRentIncrease } from '@/lib/rentCalc';

type Props = {
  contractId: number;
  currentRent: number;
};

type InputMode = 'rate' | 'amount';
type Step = 'form' | 'preview';

export function RentIncreaseForm({ contractId, currentRent }: Props) {
  const router = useRouter();

  const today = new Date().toISOString().split('T')[0];

  const [step,          setStep]          = useState<Step>('form');
  const [inputMode,     setInputMode]     = useState<InputMode>('rate');
  const [increaseType,  setIncreaseType]  = useState('manual');
  const [ratePercent,   setRatePercent]   = useState('');
  const [manualAmount,  setManualAmount]  = useState('');
  const [effectiveDate, setEffectiveDate] = useState(today);
  const [notes,         setNotes]         = useState('');
  const [loading,       setLoading]       = useState(false);
  const [apiError,      setApiError]      = useState('');

  // Canlı hesap
  let newRent:        number | null = null;
  let increaseAmount: number | null = null;
  let derivedRate:    number        = 0;

  if (inputMode === 'rate') {
    const rate = parseFloat(ratePercent);
    if (!isNaN(rate) && rate >= 0) {
      const calc  = calcRentIncrease(currentRent, rate);
      newRent        = calc.newRent;
      increaseAmount = calc.increaseAmount;
      derivedRate    = rate;
    }
  } else {
    const amt = parseFloat(manualAmount);
    if (!isNaN(amt) && amt > currentRent) {
      newRent        = Math.round(amt * 100) / 100;
      increaseAmount = Math.round((amt - currentRent) * 100) / 100;
      derivedRate    = Math.round((increaseAmount / currentRent) * 10000) / 100;
    }
  }

  const canPreview = newRent !== null && newRent > currentRent;

  async function save() {
    setApiError('');
    setLoading(true);
    try {
      const res = await fetch(`/api/contracts/${contractId}/increases`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          effectiveDate,
          increaseType,
          ratePercent: derivedRate,
          notes: notes || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Kayıt başarısız');
      }
      toast.success('Kira artışı kaydedildi');
      setRatePercent('');
      setManualAmount('');
      setNotes('');
      setStep('form');
      router.refresh();
    } catch (e: unknown) {
      setApiError((e as Error).message);
      setStep('preview');
    } finally {
      setLoading(false);
    }
  }

  // ── Önizleme adımı ───────────────────────────────────────────
  if (step === 'preview') {
    return (
      <Card style={{ padding: '20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'var(--primary-bg)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <TrendingUp size={15} color="var(--primary)" strokeWidth={2.5} />
          </div>
          <div>
            <p style={{ fontWeight: 600, fontSize: '0.9375rem', margin: 0, color: 'var(--text)' }}>
              Artış Özeti
            </p>
            <p style={{ fontSize: '0.8125rem', color: 'var(--muted)', margin: 0 }}>
              Kaydetmeden önce kontrol edin
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
          <PreviewRow label="Eski Kira"      value={`₺${currentRent.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
          <PreviewRow label="Yeni Kira"      value={`₺${newRent!.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} highlight />
          <PreviewRow label="Artış Miktarı"  value={`+₺${increaseAmount!.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
          <PreviewRow label="Oran"           value={`%${derivedRate.toLocaleString('tr-TR')}`} />
          <PreviewRow label="Artış Tipi"     value={increaseType} />
          <PreviewRow label="Geçerlilik"     value={new Date(effectiveDate).toLocaleDateString('tr-TR')} />
          {notes && <PreviewRow label="Not" value={notes} />}
        </div>

        {apiError && <div style={{ marginBottom: 12 }}><FormAlert>{apiError}</FormAlert></div>}

        <div style={{ display: 'flex', gap: 8 }}>
          <Btn variant="ghost" onClick={() => { setStep('form'); setApiError(''); }} style={{ flex: 1 }}>
            Geri Dön
          </Btn>
          <Btn onClick={save} disabled={loading} style={{ flex: 1 }}>
            {loading ? 'Kaydediliyor...' : 'Onayla ve Kaydet'}
          </Btn>
        </div>
      </Card>
    );
  }

  // ── Form adımı ───────────────────────────────────────────────
  return (
    <Card style={{ padding: '20px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: 'var(--primary-bg)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <TrendingUp size={15} color="var(--primary)" strokeWidth={2.5} />
        </div>
        <div>
          <p style={{ fontWeight: 600, fontSize: '0.9375rem', margin: 0, color: 'var(--text)' }}>
            Kira Artışı
          </p>
          <p style={{ fontSize: '0.8125rem', color: 'var(--muted)', margin: 0 }}>
            Mevcut kira: ₺{currentRent.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <SectionLabel>Artış Bilgileri</SectionLabel>

        {/* Giriş modu toggle */}
        <div style={{ display: 'flex', gap: 4, background: 'var(--surface2)', borderRadius: 8, padding: 4 }}>
          {(['rate', 'amount'] as InputMode[]).map(m => (
            <button
              key={m}
              onClick={() => setInputMode(m)}
              style={{
                flex: 1, padding: '6px 0', border: 'none', borderRadius: 6, cursor: 'pointer',
                fontSize: '0.8125rem', fontWeight: 600,
                background: inputMode === m ? 'var(--surface)' : 'transparent',
                color: inputMode === m ? 'var(--text)' : 'var(--muted)',
                boxShadow: inputMode === m ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s',
              }}
            >
              {m === 'rate' ? 'Oran ile (%)' : 'Tutar ile (₺)'}
            </button>
          ))}
        </div>

        <FieldRow>
          <Field label="Artış Tipi">
            <Select value={increaseType} onChange={e => setIncreaseType(e.target.value)}>
              <option value="monthly_tufe">Aylık TÜFE</option>
              <option value="avg12_tufe">12A Ort. TÜFE</option>
              <option value="manual">Manuel</option>
            </Select>
          </Field>

          {inputMode === 'rate' ? (
            <Field label="Oran (%)" required>
              <NumberInput
                value={ratePercent}
                onChange={e => setRatePercent(e.target.value)}
                placeholder="örn. 48.5"
                min={0}
                step={0.01}
              />
            </Field>
          ) : (
            <Field label="Yeni Kira (₺)" required>
              <NumberInput
                value={manualAmount}
                onChange={e => setManualAmount(e.target.value)}
                placeholder={`${currentRent} üzeri`}
                min={currentRent + 1}
                step={1}
              />
            </Field>
          )}
        </FieldRow>

        <Field label="Geçerlilik Tarihi" required>
          <DateInput
            value={effectiveDate}
            onChange={e => setEffectiveDate(e.target.value)}
          />
        </Field>

        {/* Canlı önizleme */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
          gap: 12, padding: '14px 16px',
          background: 'var(--surface2)', borderRadius: 10,
          border: `1px solid ${canPreview ? 'var(--primary-bg)' : 'var(--border)'}`,
          transition: 'border-color 0.2s',
        }}>
          <div>
            <p style={{
              fontSize: '0.6875rem', fontWeight: 600, color: 'var(--muted)',
              textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0,
            }}>
              Eski Kira
            </p>
            <p style={{
              fontSize: '1.125rem', fontWeight: 700, color: 'var(--text)',
              fontFamily: 'ui-monospace, monospace', margin: '4px 0 0', letterSpacing: '-0.02em',
            }}>
              ₺{currentRent.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div>
            <p style={{
              fontSize: '0.6875rem', fontWeight: 600, color: 'var(--muted)',
              textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0,
            }}>
              Artış Miktarı
            </p>
            <p style={{
              fontSize: '1.125rem', fontWeight: 700,
              color: increaseAmount != null ? 'var(--primary)' : 'var(--subtle)',
              fontFamily: 'ui-monospace, monospace', margin: '4px 0 0', letterSpacing: '-0.02em',
            }}>
              {increaseAmount != null ? `+₺${increaseAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
            </p>
          </div>
          <div>
            <p style={{
              fontSize: '0.6875rem', fontWeight: 600, color: 'var(--muted)',
              textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0,
            }}>
              Yeni Kira
            </p>
            <p style={{
              fontSize: '1.125rem', fontWeight: 700,
              color: newRent != null ? 'var(--green)' : 'var(--subtle)',
              fontFamily: 'ui-monospace, monospace', margin: '4px 0 0', letterSpacing: '-0.02em',
            }}>
              {newRent != null ? `₺${newRent.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
            </p>
          </div>
        </div>

        <Field label="Notlar">
          <input
            type="text"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="İsteğe bağlı not..."
          />
        </Field>

        <Btn onClick={() => setStep('preview')} disabled={!canPreview}>
          Önizle
        </Btn>
      </div>
    </Card>
  );
}

// ── Yardımcı ─────────────────────────────────────────────────
function PreviewRow({
  label, value, highlight,
}: {
  label: string; value: string; highlight?: boolean;
}) {
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
