'use client';

import { useState } from 'react';
import {
  Btn, Modal, ModalBody, ModalFooter, toast,
  Field, FieldRow, SectionLabel, FormAlert, NumberInput, DateInput, Select,
} from '@/components/ui';

interface Props {
  open:       boolean;
  onClose:    () => void;
  onSuccess:  () => void;
  /** POST endpoint to submit payment to */
  endpoint:   string;
  /** Pre-filled amount (remaining balance) */
  remaining:  number;
  /** Label shown in the header (e.g. tenant name) */
  label?:     string;
}

export function PaymentModal({ open, onClose, onSuccess, endpoint, remaining, label }: Props) {
  const today = new Date().toISOString().split('T')[0];

  const [amount,   setAmount]   = useState(String(remaining));
  const [paidAt,   setPaidAt]   = useState(today);
  const [method,   setMethod]   = useState('bank');
  const [refNo,    setRefNo]    = useState('');
  const [notes,    setNotes]    = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error,    setError]    = useState('');

  function handleClose() {
    setAmount(String(remaining));
    setPaidAt(today);
    setMethod('bank');
    setRefNo('');
    setNotes('');
    setError('');
    onClose();
  }

  async function submit() {
    const amt = Number(amount);
    if (!amt || amt <= 0) { setError('Geçerli bir tutar girin'); return; }
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch(endpoint, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amt,
          method,
          referenceNo: refNo || undefined,
          notes:       notes || undefined,
          paidAt:      paidAt || undefined,
        }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? 'Ödeme kaydedilemedi');
      }
      toast.success('Ödeme başarıyla kaydedildi');
      handleClose();
      onSuccess();
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  const isPartial = !!amount && Number(amount) < remaining;

  return (
    <Modal open={open} onClose={handleClose} title="Ödeme Al" width={440}>
      <ModalBody>
        {label && (
          <p style={{ fontSize: '0.875rem', color: 'var(--muted)', margin: '0 0 16px' }}>
            {label}
          </p>
        )}

        <SectionLabel>Ödeme Bilgileri</SectionLabel>

        <FieldRow>
          <Field
            label="Tutar (₺)"
            required
            hint={`Kalan: ₺${remaining.toLocaleString('tr-TR')}${isPartial ? ' · Kısmi ödeme' : ''}`}
          >
            <NumberInput
              value={amount}
              onChange={e => setAmount(e.target.value)}
              min={0.01}
              step={0.01}
            />
          </Field>

          <Field label="Ödeme Tarihi" required>
            <DateInput
              value={paidAt}
              onChange={e => setPaidAt(e.target.value)}
            />
          </Field>
        </FieldRow>

        <Field label="Ödeme Yöntemi">
          <Select value={method} onChange={e => setMethod(e.target.value)}>
            <option value="bank">Banka Transferi</option>
            <option value="cash">Nakit</option>
            <option value="eft">EFT</option>
            <option value="check">Çek</option>
            <option value="other">Diğer</option>
          </Select>
        </Field>

        <Field label="Dekont / Havale No" hint="Opsiyonel referans numarası">
          <input
            type="text"
            value={refNo}
            onChange={e => setRefNo(e.target.value)}
            placeholder="Opsiyonel"
          />
        </Field>

        <Field label="Not" hint="Opsiyonel açıklama">
          <input
            type="text"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Opsiyonel"
          />
        </Field>

        {error && <FormAlert>{error}</FormAlert>}
      </ModalBody>

      <ModalFooter>
        <Btn variant="ghost" onClick={handleClose}>İptal</Btn>
        <Btn onClick={submit} disabled={!amount || Number(amount) <= 0 || submitting}>
          {submitting ? 'Kaydediliyor...' : isPartial ? 'Kısmi Ödemeyi Kaydet' : 'Ödemeyi Kaydet'}
        </Btn>
      </ModalFooter>
    </Modal>
  );
}
