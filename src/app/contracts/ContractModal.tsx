'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { Btn, Modal, ModalBody, ModalFooter, toast } from '@/components/ui';
import {
  Field, FieldRow, SectionLabel, FormAlert,
  Select, NumberInput, DateInput,
} from '@/components/ui';

type Unit   = { id: number; unitNo: string; property: { title: string } };
type Tenant = { id: number; name: string };

type Form = {
  unitId: string; tenantId: string;
  startDate: string; endDate: string;
  rentAmount: string; paymentDay: string;
  depositAmount: string; currency: string;
};

const INIT: Form = {
  unitId: '', tenantId: '',
  startDate: '', endDate: '',
  rentAmount: '', paymentDay: '1',
  depositAmount: '', currency: 'TRY',
};

export function ContractModal({ units, tenants }: { units: Unit[]; tenants: Tenant[] }) {
  const [open, setOpen]       = useState(false);
  const [form, setForm]       = useState<Form>(INIT);
  const [errors, setErrors]   = useState<Partial<Form>>({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const router = useRouter();

  const set = (key: keyof Form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value }));

  function validate(): boolean {
    const e: Partial<Form> = {};
    if (!form.unitId)                                          e.unitId     = 'Daire seçin';
    if (!form.tenantId)                                        e.tenantId   = 'Kiracı seçin';
    if (!form.startDate)                                       e.startDate  = 'Zorunlu alan';
    if (!form.rentAmount || Number(form.rentAmount) <= 0)      e.rentAmount = 'Geçerli bir tutar girin';
    if (form.paymentDay) {
      const d = Number(form.paymentDay);
      if (!Number.isInteger(d) || d < 1 || d > 28)            e.paymentDay = '1–28 arası olmalı';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submit() {
    if (!validate()) return;
    setLoading(true);
    setApiError('');

    try {
      const body = Object.fromEntries(
        Object.entries(form).filter(([, v]) => v !== ''),
      );
      const res  = await fetch('/api/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Bir hata oluştu');
      toast.success('Sözleşme başarıyla oluşturuldu');
      handleClose();
      router.refresh();
    } catch (err: unknown) {
      setApiError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setOpen(false);
    setForm(INIT);
    setErrors({});
    setApiError('');
  }

  return (
    <>
      <Btn onClick={() => setOpen(true)}>
        <Plus size={14} /> Yeni Sözleşme
      </Btn>

      <Modal open={open} onClose={handleClose} title="Yeni Sözleşme" width={540}>
        <ModalBody>

          {/* ── Taraflar ── */}
          <SectionLabel>Taraflar</SectionLabel>

          <Field label="Daire (Boş)" required error={errors.unitId}>
            <Select
              name="unitId" value={form.unitId}
              onChange={set('unitId')} hasError={!!errors.unitId}
            >
              <option value="">Seçin...</option>
              {units.map(u => (
                <option key={u.id} value={String(u.id)}>
                  {u.property.title} / {u.unitNo}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Kiracı" required error={errors.tenantId}>
            <Select
              name="tenantId" value={form.tenantId}
              onChange={set('tenantId')} hasError={!!errors.tenantId}
            >
              <option value="">Seçin...</option>
              {tenants.map(t => (
                <option key={t.id} value={String(t.id)}>{t.name}</option>
              ))}
            </Select>
          </Field>

          {/* ── Süre ── */}
          <SectionLabel>Süre</SectionLabel>

          <FieldRow>
            <Field label="Başlangıç" required error={errors.startDate}>
              <DateInput
                name="startDate" value={form.startDate}
                onChange={set('startDate')} hasError={!!errors.startDate}
              />
            </Field>
            <Field label="Bitiş (opsiyonel)">
              <DateInput name="endDate" value={form.endDate} onChange={set('endDate')} />
            </Field>
          </FieldRow>

          {/* ── Finansal ── */}
          <SectionLabel>Finansal</SectionLabel>

          <FieldRow>
            <Field label="Aylık Kira (₺)" required error={errors.rentAmount}>
              <NumberInput
                name="rentAmount" value={form.rentAmount}
                onChange={set('rentAmount')} placeholder="15000"
                hasError={!!errors.rentAmount}
              />
            </Field>
            <Field label="Ödeme Günü (1–28)" error={errors.paymentDay}
              hint="Ayın hangi günü alacak oluşturulsun">
              <NumberInput
                name="paymentDay" value={form.paymentDay}
                onChange={set('paymentDay')} placeholder="1"
                hasError={!!errors.paymentDay}
              />
            </Field>
          </FieldRow>

          <FieldRow>
            <Field label="Depozito (₺)">
              <NumberInput
                name="depositAmount" value={form.depositAmount}
                onChange={set('depositAmount')} placeholder="30000"
              />
            </Field>
            <Field label="Para Birimi">
              <Select name="currency" value={form.currency} onChange={set('currency')}>
                <option value="TRY">₺ Türk Lirası</option>
                <option value="USD">$ Dolar</option>
                <option value="EUR">€ Euro</option>
              </Select>
            </Field>
          </FieldRow>

          {apiError && <FormAlert>{apiError}</FormAlert>}
        </ModalBody>

        <ModalFooter>
          <Btn variant="ghost" onClick={handleClose}>İptal</Btn>
          <Btn onClick={submit} disabled={loading}>
            {loading ? 'Kaydediliyor...' : 'Sözleşme Oluştur'}
          </Btn>
        </ModalFooter>
      </Modal>
    </>
  );
}
