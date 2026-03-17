'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';
import {
  Btn, Modal, ModalBody, ModalFooter, toast,
  Field, FieldRow, SectionLabel, FormAlert,
  NumberInput, DateInput,
} from '@/components/ui';

type Props = {
  contractId:        number;
  currentRent:       number;
  currentEndDate:    string | null;
  currentDeposit:    number;
  currentPaymentDay: number;
  label:             string; // e.g. "Daire 3 — Kiracı Adı"
};

function addOneYear(dateStr: string): string {
  const d = new Date(dateStr);
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().split('T')[0];
}

export function ContractRenewModal({ contractId, currentRent, currentEndDate, currentDeposit, currentPaymentDay, label }: Props) {
  const router = useRouter();

  const defaultStart = currentEndDate
    ? new Date(new Date(currentEndDate).getTime() + 86_400_000).toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0];

  const [open,           setOpen]           = useState(false);
  const [step,           setStep]           = useState<'form' | 'preview'>('form');
  const [newStartDate,   setNewStartDate]   = useState(defaultStart);
  const [newEndDate,     setNewEndDate]     = useState(addOneYear(defaultStart));
  const [newRent,        setNewRent]        = useState(String(currentRent));
  const [newDeposit,     setNewDeposit]     = useState(String(currentDeposit));
  const [newPaymentDay,  setNewPaymentDay]  = useState(String(currentPaymentDay));
  const [loading,        setLoading]        = useState(false);
  const [apiError,       setApiError]       = useState('');

  const rentNum       = parseFloat(newRent)       || 0;
  const depositNum    = parseFloat(newDeposit)    || 0;
  const paymentDayNum = parseInt(newPaymentDay)   || 1;

  function handleOpen() {
    setStep('form');
    setApiError('');
    setNewStartDate(defaultStart);
    setNewEndDate(addOneYear(defaultStart));
    setNewRent(String(currentRent));
    setNewDeposit(String(currentDeposit));
    setNewPaymentDay(String(currentPaymentDay));
    setOpen(true);
  }

  async function save() {
    setApiError('');
    setLoading(true);
    try {
      const res = await fetch(`/api/contracts/${contractId}/renew`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          newStartDate,
          newEndDate:    newEndDate || null,
          newRent:       rentNum,
          depositAmount: depositNum,
          paymentDay:    paymentDayNum,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Yenileme başarısız');
      }
      toast.success('Sözleşme yenilendi');
      setOpen(false);
      router.refresh();
    } catch (e: unknown) {
      setApiError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={handleOpen}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          height: 28, padding: '0 10px', borderRadius: 6,
          fontSize: '0.8125rem', fontWeight: 600,
          background: 'var(--primary-bg)', color: 'var(--primary)',
          border: '1px solid var(--primary-ring)',
          cursor: 'pointer',
        }}
        title={`${label} sözleşmesini yenile`}
      >
        <RefreshCw size={12} />
        Yenile
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Sözleşme Yenile"
        width={480}
      >
        {step === 'form' && (
          <>
            <ModalBody>
              <p style={{ fontSize: '0.8125rem', color: 'var(--muted)', margin: '0 0 16px' }}>
                <strong style={{ color: 'var(--text)' }}>{label}</strong> — Mevcut kira:{' '}
                <strong style={{ color: 'var(--primary)', fontFamily: 'ui-monospace, monospace' }}>
                  ₺{currentRent.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </strong>
              </p>

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

              <FieldRow>
                <Field label="Yeni Kira (₺)" required>
                  <NumberInput
                    value={newRent}
                    onChange={e => setNewRent(e.target.value)}
                    min={1}
                    step={1}
                  />
                </Field>
                <Field label="Ödeme Günü (1–28)">
                  <NumberInput
                    value={newPaymentDay}
                    onChange={e => setNewPaymentDay(e.target.value)}
                    min={1}
                    max={28}
                    step={1}
                  />
                </Field>
              </FieldRow>

              <Field label="Depozito (₺)">
                <NumberInput
                  value={newDeposit}
                  onChange={e => setNewDeposit(e.target.value)}
                  min={0}
                  step={1}
                />
              </Field>

              <div style={{
                marginTop: 12, padding: '10px 14px', borderRadius: 8,
                background: 'var(--primary-bg)', border: '1px solid var(--primary-ring)',
                fontSize: '0.8125rem', color: 'var(--muted)',
              }}>
                Mevcut sözleşme kapatılacak, yeni sözleşme oluşturulacak.
              </div>
            </ModalBody>

            <ModalFooter>
              <Btn variant="ghost" onClick={() => setOpen(false)}>İptal</Btn>
              <Btn
                onClick={() => setStep('preview')}
                disabled={!newStartDate || rentNum <= 0}
              >
                Önizle
              </Btn>
            </ModalFooter>
          </>
        )}

        {step === 'preview' && (
          <>
            <ModalBody>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                {[
                  { label: 'Yeni Başlangıç', value: new Date(newStartDate).toLocaleDateString('tr-TR'), hi: true  },
                  { label: 'Yeni Bitiş',     value: newEndDate ? new Date(newEndDate).toLocaleDateString('tr-TR') : 'Belirsiz', hi: false },
                  { label: 'Eski Kira',       value: `₺${currentRent.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,  hi: false },
                  { label: 'Yeni Kira',       value: `₺${rentNum.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,       hi: true  },
                  { label: 'Depozito',        value: `₺${depositNum.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,    hi: false },
                  { label: 'Ödeme Günü',      value: `Her ayın ${paymentDayNum}. günü`,                                                                   hi: false },
                ].map(row => (
                  <div key={row.label} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '9px 13px', borderRadius: 8,
                    background: row.hi ? 'var(--primary-bg)' : 'var(--surface2)',
                  }}>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--muted)' }}>{row.label}</span>
                    <span style={{
                      fontSize: '0.875rem', fontWeight: row.hi ? 700 : 500,
                      color: row.hi ? 'var(--primary)' : 'var(--text)',
                      fontFamily: 'ui-monospace, monospace',
                    }}>
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>

              {apiError && <FormAlert>{apiError}</FormAlert>}
            </ModalBody>

            <ModalFooter>
              <Btn variant="ghost" onClick={() => { setStep('form'); setApiError(''); }}>
                Geri
              </Btn>
              <Btn onClick={save} disabled={loading}>
                {loading ? 'Yenileniyor...' : 'Onayla ve Yenile'}
              </Btn>
            </ModalFooter>
          </>
        )}
      </Modal>
    </>
  );
}
