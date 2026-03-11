'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Eye, ArrowLeft, FileDown } from 'lucide-react';
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

type Step = 'form' | 'preview' | 'done';

export function ContractModal({ units, tenants }: { units: Unit[]; tenants: Tenant[] }) {
  const [open,       setOpen]       = useState(false);
  const [step,       setStep]       = useState<Step>('form');
  const [form,       setForm]       = useState<Form>(INIT);
  const [errors,     setErrors]     = useState<Partial<Form>>({});
  const [loading,    setLoading]    = useState(false);
  const [apiError,   setApiError]   = useState('');
  const [createdId,  setCreatedId]  = useState<number | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [rates,      setRates]      = useState<Record<string, { buying: number }> | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/exchange-rates')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data && !data.error) setRates(data); })
      .catch(() => {});
  }, []);

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
    if (form.endDate && form.startDate && form.endDate <= form.startDate) {
      e.endDate = 'Bitiş tarihi başlangıçtan sonra olmalı';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function goPreview() {
    if (!validate()) return;
    setStep('preview');
  }

  async function submit() {
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
      setCreatedId(json.id);
      setStep('done');
      router.refresh();
    } catch (err: unknown) {
      setApiError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function downloadPdf(id: number) {
    setPdfLoading(true);
    try {
      const res = await fetch(`/api/contracts/${id}/pdf`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'PDF oluşturulamadı' }));
        throw new Error(err.error ?? 'PDF oluşturulamadı');
      }
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `sozlesme-${id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: unknown) {
      toast.error((e as Error).message);
    } finally {
      setPdfLoading(false);
    }
  }

  function handleClose() {
    setOpen(false);
    setStep('form');
    setForm(INIT);
    setErrors({});
    setApiError('');
    setCreatedId(null);
  }

  const selectedUnit   = units.find(u => String(u.id) === form.unitId);
  const selectedTenant = tenants.find(t => String(t.id) === form.tenantId);

  const fmtDate  = (s: string) =>
    s ? new Date(s).toLocaleDateString('tr-TR') : '—';
  const fmtMoney = (s: string, cur: string) =>
    s ? `${Number(s).toLocaleString('tr-TR')} ${cur === 'TRY' ? 'TL' : cur}` : '—';

  const tryHint = (() => {
    if (form.currency === 'TRY' || !form.rentAmount || !rates) return null;
    const rate = rates[form.currency]?.buying;
    if (!rate) return null;
    const tryAmount = Number(form.rentAmount) * rate;
    return `≈ ₺${tryAmount.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} (TCMB alış, ${new Date().toLocaleDateString('tr-TR')})`;
  })();

  const title =
    step === 'form'    ? 'Yeni Sözleşme'       :
    step === 'preview' ? 'Sözleşme Önizleme'    :
                         'Sözleşme Oluşturuldu';

  return (
    <>
      <Btn onClick={() => setOpen(true)}>
        <Plus size={14} /> Yeni Sözleşme
      </Btn>

      <Modal open={open} onClose={handleClose} title={title} width={540}>

        {/* ── STEP 1: FORM ── */}
        {step === 'form' && (
          <>
            <ModalBody>
              <SectionLabel>Taraflar</SectionLabel>

              <Field label="Daire (Boş)" required error={errors.unitId}>
                <Select name="unitId" value={form.unitId} onChange={set('unitId')} hasError={!!errors.unitId}>
                  <option value="">Seçin...</option>
                  {units.map(u => (
                    <option key={u.id} value={String(u.id)}>
                      {u.property.title} / {u.unitNo}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="Kiracı" required error={errors.tenantId}>
                <Select name="tenantId" value={form.tenantId} onChange={set('tenantId')} hasError={!!errors.tenantId}>
                  <option value="">Seçin...</option>
                  {tenants.map(t => (
                    <option key={t.id} value={String(t.id)}>{t.name}</option>
                  ))}
                </Select>
              </Field>

              <SectionLabel>Süre</SectionLabel>

              <FieldRow>
                <Field label="Başlangıç" required error={errors.startDate}>
                  <DateInput name="startDate" value={form.startDate} onChange={set('startDate')} hasError={!!errors.startDate} />
                </Field>
                <Field label="Bitiş (opsiyonel)" error={errors.endDate}>
                  <DateInput name="endDate" value={form.endDate} onChange={set('endDate')} hasError={!!errors.endDate} />
                </Field>
              </FieldRow>

              <SectionLabel>Finansal</SectionLabel>

              <FieldRow>
                <Field label="Aylık Kira" required error={errors.rentAmount}>
                  <NumberInput name="rentAmount" value={form.rentAmount} onChange={set('rentAmount')} placeholder="15000" hasError={!!errors.rentAmount} />
                </Field>
                <Field label="Ödeme Günü (1–28)" error={errors.paymentDay} hint="Ayın hangi günü alacak oluşturulsun">
                  <NumberInput name="paymentDay" value={form.paymentDay} onChange={set('paymentDay')} placeholder="1" hasError={!!errors.paymentDay} />
                </Field>
              </FieldRow>

              {tryHint && (
                <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: 4, marginBottom: 0 }}>
                  {tryHint}
                </p>
              )}

              <FieldRow>
                <Field label="Depozito (₺)">
                  <NumberInput name="depositAmount" value={form.depositAmount} onChange={set('depositAmount')} placeholder="30000" />
                </Field>
                <Field label="Para Birimi">
                  <Select name="currency" value={form.currency} onChange={set('currency')}>
                    <option value="TRY">₺ Türk Lirası</option>
                    <option value="USD">$ Dolar</option>
                    <option value="EUR">€ Euro</option>
                    <option value="GBP">£ Sterlin</option>
                    <option value="CHF">₣ Frank</option>
                  </Select>
                </Field>
              </FieldRow>

              {apiError && <FormAlert>{apiError}</FormAlert>}
            </ModalBody>

            <ModalFooter>
              <Btn variant="ghost" onClick={handleClose}>İptal</Btn>
              <Btn onClick={goPreview}>
                <Eye size={14} /> Önizle
              </Btn>
            </ModalFooter>
          </>
        )}

        {/* ── STEP 2: PREVIEW ── */}
        {step === 'preview' && (
          <>
            <ModalBody>
              <p style={{ fontSize: '0.8125rem', color: 'var(--muted)', margin: '0 0 16px' }}>
                Bilgileri kontrol edin. Onayladıktan sonra sözleşme kaydedilir.
              </p>

              <div style={{
                background: 'var(--surface2)', borderRadius: 10,
                padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10,
              }}>
                <PreviewRow label="Daire"
                  value={selectedUnit ? `${selectedUnit.property.title} / ${selectedUnit.unitNo}` : '—'} />
                <PreviewRow label="Kiracı"     value={selectedTenant?.name ?? '—'} />
                <Divider />
                <PreviewRow label="Başlangıç"  value={fmtDate(form.startDate)} />
                <PreviewRow label="Bitiş"      value={form.endDate ? fmtDate(form.endDate) : 'Belirsiz süreli'} />
                <Divider />
                <PreviewRow label="Aylık Kira" value={fmtMoney(form.rentAmount, form.currency)} bold />
                <PreviewRow label="Depozito"   value={form.depositAmount ? fmtMoney(form.depositAmount, form.currency) : '—'} />
                <PreviewRow label="Ödeme Günü" value={`Her ayın ${form.paymentDay || '1'}. günü`} />
              </div>

              {apiError && (
                <div style={{ marginTop: 12 }}>
                  <FormAlert>{apiError}</FormAlert>
                </div>
              )}
            </ModalBody>

            <ModalFooter>
              <Btn variant="ghost" onClick={() => { setStep('form'); setApiError(''); }}>
                <ArrowLeft size={14} /> Geri
              </Btn>
              <Btn onClick={submit} disabled={loading}>
                {loading ? 'Kaydediliyor...' : 'Sözleşme Oluştur'}
              </Btn>
            </ModalFooter>
          </>
        )}

        {/* ── STEP 3: DONE ── */}
        {step === 'done' && createdId && (
          <>
            <ModalBody>
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: 16, padding: '20px 0 12px',
              }}>
                <div style={{
                  width: 52, height: 52, borderRadius: '50%',
                  background: 'var(--green-bg)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
                    stroke="var(--green)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontWeight: 600, fontSize: '1rem', margin: '0 0 6px', color: 'var(--text)' }}>
                    Sözleşme başarıyla oluşturuldu
                  </p>
                  <p style={{ fontSize: '0.875rem', color: 'var(--muted)', margin: 0 }}>
                    PDF olarak indirip yazdırabilir, imzaya hazırlayabilirsiniz.
                  </p>
                </div>
              </div>
            </ModalBody>

            <ModalFooter>
              <Btn variant="ghost" onClick={handleClose}>Kapat</Btn>
              <Btn onClick={() => downloadPdf(createdId)} disabled={pdfLoading}>
                <FileDown size={14} />
                {pdfLoading ? 'Hazırlanıyor...' : 'PDF Oluştur / İndir'}
              </Btn>
            </ModalFooter>
          </>
        )}
      </Modal>
    </>
  );
}

function PreviewRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
      <span style={{ fontSize: '0.8125rem', color: 'var(--muted)', fontWeight: 500, flexShrink: 0 }}>
        {label}
      </span>
      <span style={{
        fontSize: '0.875rem', color: 'var(--text)',
        fontWeight: bold ? 700 : 500,
        fontFamily: bold ? 'ui-monospace, monospace' : undefined,
        textAlign: 'right',
      }}>
        {value}
      </span>
    </div>
  );
}

function Divider() {
  return <div style={{ height: 1, background: 'var(--border)', margin: '2px 0' }} />;
}
