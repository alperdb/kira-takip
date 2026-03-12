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
  id:            number;
  unitId:        number;
  tenantId:      number;
  startDate:     string;
  endDate:       string | null;
  rentAmount:    number;
  depositAmount: number;
  paymentDay:    number;
  bankName:      string | null;
  iban:          string | null;
  accountHolder: string | null;
};

interface Props {
  contract:   Contract;
  allUnits:   Unit[];
  allTenants: Tenant[];
}

export function ContractEditModal({ contract, allUnits, allTenants }: Props) {
  const router = useRouter();
  const [open,    setOpen]    = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [apiError, setApiError] = useState('');

  const [unitId,        setUnitId]        = useState(String(contract.unitId));
  const [tenantId,      setTenantId]      = useState(String(contract.tenantId));
  const [startDate,     setStartDate]     = useState(contract.startDate);
  const [endDate,       setEndDate]       = useState(contract.endDate ?? '');
  const [rentAmount,    setRentAmount]    = useState(String(contract.rentAmount));
  const [depositAmount, setDepositAmount] = useState(String(contract.depositAmount));
  const [paymentDay,    setPaymentDay]    = useState(String(contract.paymentDay));
  const [bankName,      setBankName]      = useState(contract.bankName ?? '');
  const [iban,          setIban]          = useState(contract.iban ?? '');
  const [accountHolder, setAccountHolder] = useState(contract.accountHolder ?? '');

  async function handleSave() {
    const pd = Number(paymentDay);
    if (!pd || pd < 1 || pd > 28) { toast.error('Ödeme günü 1–28 arası olmalı'); return; }
    if (!startDate) { toast.error('Başlangıç tarihi zorunlu'); return; }
    if (endDate && endDate <= startDate) { toast.error('Bitiş tarihi başlangıçtan sonra olmalı'); return; }
    if (!rentAmount || Number(rentAmount) <= 0) { toast.error('Geçerli bir kira tutarı girin'); return; }

    setSaving(true);
    setApiError('');
    try {
      const res = await fetch(`/api/contracts/${contract.id}`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unitId:        Number(unitId),
          tenantId:      Number(tenantId),
          startDate,
          endDate:       endDate || null,
          rentAmount:    Number(rentAmount),
          depositAmount: Number(depositAmount) || 0,
          paymentDay:    pd,
          bankName:      bankName.trim() || null,
          iban:          iban.trim() || null,
          accountHolder: accountHolder.trim() || null,
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
          height: 28, padding: '0 10px', borderRadius: 6,
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

      <Modal open={open} onClose={() => setOpen(false)} title="Sözleşmeyi Düzenle" width={520}>
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
            <Field label="Depozito">
              <NumberInput
                value={depositAmount}
                onChange={e => setDepositAmount(e.target.value)}
                placeholder="0"
              />
            </Field>
          </FieldRow>

          <Field label="Ödeme Günü (1–28)" required>
            <NumberInput
              value={paymentDay}
              onChange={e => setPaymentDay(e.target.value)}
              min={1} max={28} step={1}
            />
          </Field>

          <SectionLabel>Banka Bilgileri (PDF)</SectionLabel>

          <Field label="Banka Adı">
            <input
              type="text"
              value={bankName}
              onChange={e => setBankName(e.target.value)}
              placeholder="Örn: Ziraat Bankası"
              style={{
                width: '100%', padding: '8px 12px', borderRadius: 8,
                border: '1px solid var(--border)', background: 'var(--surface)',
                color: 'var(--text)', fontSize: '0.875rem',
                outline: 'none', boxSizing: 'border-box',
              }}
            />
          </Field>

          <Field label="IBAN">
            <input
              type="text"
              value={iban}
              onChange={e => setIban(e.target.value)}
              placeholder="TR00 0000 0000 0000 0000 0000 00"
              style={{
                width: '100%', padding: '8px 12px', borderRadius: 8,
                border: '1px solid var(--border)', background: 'var(--surface)',
                color: 'var(--text)', fontSize: '0.875rem',
                outline: 'none', boxSizing: 'border-box',
                fontFamily: 'ui-monospace, monospace', letterSpacing: '0.02em',
              }}
            />
          </Field>

          <Field label="Hesap Sahibi">
            <input
              type="text"
              value={accountHolder}
              onChange={e => setAccountHolder(e.target.value)}
              placeholder="Hesap sahibinin tam adı"
              style={{
                width: '100%', padding: '8px 12px', borderRadius: 8,
                border: '1px solid var(--border)', background: 'var(--surface)',
                color: 'var(--text)', fontSize: '0.875rem',
                outline: 'none', boxSizing: 'border-box',
              }}
            />
          </Field>

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
