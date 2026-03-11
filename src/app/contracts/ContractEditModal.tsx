'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil } from 'lucide-react';
import {
  Btn, Modal, ModalBody, ModalFooter, toast,
  Field, FieldRow, SectionLabel, FormAlert,
  Select, NumberInput, DateInput,
} from '@/components/ui';

type Unit   = { id: number; unitNo: string; property: { title: string } };
type Tenant = { id: number; name: string };

type Contract = {
  id:          number;
  unitId:      number;
  tenantId:    number;
  startDate:   string;
  endDate:     string | null;
  rentAmount:  number;
  paymentDay:  number;
};

interface Props {
  contract: Contract;
  allUnits:    Unit[];
  allTenants:  Tenant[];
}

export function ContractEditModal({ contract, allUnits, allTenants }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState('');

  const [unitId,     setUnitId]     = useState(String(contract.unitId));
  const [tenantId,   setTenantId]   = useState(String(contract.tenantId));
  const [startDate,  setStartDate]  = useState(contract.startDate);
  const [endDate,    setEndDate]    = useState(contract.endDate ?? '');
  const [rentAmount, setRentAmount] = useState(String(contract.rentAmount));
  const [paymentDay, setPaymentDay] = useState(String(contract.paymentDay));

  async function handleSave() {
    const pd = Number(paymentDay);
    if (!pd || pd < 1 || pd > 28) {
      toast.error('Ödeme günü 1–28 arası olmalı');
      return;
    }
    if (!startDate) {
      toast.error('Başlangıç tarihi zorunlu');
      return;
    }
    if (endDate && endDate <= startDate) {
      toast.error('Bitiş tarihi başlangıçtan sonra olmalı');
      return;
    }
    if (!rentAmount || Number(rentAmount) <= 0) {
      toast.error('Geçerli bir kira tutarı girin');
      return;
    }

    setSaving(true);
    setApiError('');
    try {
      const res = await fetch(`/api/contracts/${contract.id}`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unitId:     Number(unitId),
          tenantId:   Number(tenantId),
          startDate,
          endDate:    endDate || null,
          rentAmount: Number(rentAmount),
          paymentDay: pd,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Güncelleme başarısız');
      toast.success('Sözleşme güncellendi');
      setOpen(false);
      router.refresh();
    } catch (e: unknown) {
      setApiError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          padding: '4px 10px', borderRadius: 6,
          fontSize: '0.8125rem', fontWeight: 600,
          background: 'var(--surface2)', color: 'var(--muted)',
          border: '1px solid var(--border)',
          cursor: 'pointer',
        }}
        title="Sözleşmeyi Düzenle"
      >
        <Pencil size={12} />
        Düzenle
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Sözleşmeyi Düzenle" width={500}>
        <ModalBody>
          <SectionLabel>Taraflar</SectionLabel>

          <Field label="Daire">
            <Select value={unitId} onChange={e => setUnitId(e.target.value)}>
              {allUnits.map(u => (
                <option key={u.id} value={String(u.id)}>
                  {u.property.title} / {u.unitNo}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Kiracı">
            <Select value={tenantId} onChange={e => setTenantId(e.target.value)}>
              {allTenants.map(t => (
                <option key={t.id} value={String(t.id)}>{t.name}</option>
              ))}
            </Select>
          </Field>

          <SectionLabel>Süre</SectionLabel>

          <FieldRow>
            <Field label="Başlangıç" required>
              <DateInput value={startDate} onChange={e => setStartDate(e.target.value)} />
            </Field>
            <Field label="Bitiş (opsiyonel)">
              <DateInput value={endDate} onChange={e => setEndDate(e.target.value)} />
            </Field>
          </FieldRow>

          <SectionLabel>Finansal</SectionLabel>

          <FieldRow>
            <Field label="Aylık Kira" required>
              <NumberInput
                value={rentAmount}
                onChange={e => setRentAmount(e.target.value)}
                placeholder="15000"
              />
            </Field>
            <Field label="Ödeme Günü (1–28)" required>
              <NumberInput
                value={paymentDay}
                onChange={e => setPaymentDay(e.target.value)}
                min={1} max={28} step={1}
              />
            </Field>
          </FieldRow>

          {apiError && <FormAlert>{apiError}</FormAlert>}
        </ModalBody>
        <ModalFooter>
          <Btn variant="ghost" onClick={() => setOpen(false)}>İptal</Btn>
          <Btn onClick={handleSave} disabled={saving}>
            {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </Btn>
        </ModalFooter>
      </Modal>
    </>
  );
}
