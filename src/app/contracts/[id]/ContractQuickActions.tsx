'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Download, Pencil, TrendingUp, CreditCard } from 'lucide-react';
import {
  Btn, Card, toast,
  Modal, ModalBody, ModalFooter,
  Field, FieldRow, DateInput, NumberInput,
} from '@/components/ui';
import { PaymentModal } from '@/components/PaymentModal';

interface Props {
  contractId:  number;
  startDate:   string;
  endDate?:    string;
  paymentDay:  number;
  tenantName?: string;
}

export function ContractQuickActions({ contractId, startDate, endDate: initEndDate, paymentDay: initPaymentDay, tenantName }: Props) {
  const router = useRouter();

  const [pdfLoading,   setPdfLoading]   = useState(false);
  const [viewLoading,  setViewLoading]  = useState(false);
  const [editOpen,     setEditOpen]     = useState(false);
  const [payOpen,      setPayOpen]      = useState(false);
  const [outstanding,  setOutstanding]  = useState(0);
  const [formEndDate,  setFormEndDate]  = useState(initEndDate ?? '');
  const [formPayDay,   setFormPayDay]   = useState(String(initPaymentDay));
  const [saving,       setSaving]       = useState(false);

  useEffect(() => {
    fetch(`/api/contracts/${contractId}/payments`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setOutstanding(d.totalOutstanding); })
      .catch(() => {});
  }, [contractId]);

  async function handleViewPdf() {
    setViewLoading(true);
    try {
      const res = await fetch(`/api/contracts/${contractId}/pdf`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'PDF oluşturulamadı' }));
        throw new Error(err.error ?? 'PDF oluşturulamadı');
      }
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (e: unknown) {
      toast.error((e as Error).message);
    } finally {
      setViewLoading(false);
    }
  }

  async function handleDownloadPdf() {
    setPdfLoading(true);
    try {
      const res = await fetch(`/api/contracts/${contractId}/pdf`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'PDF oluşturulamadı' }));
        throw new Error(err.error ?? 'PDF oluşturulamadı');
      }
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `sozlesme-${contractId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: unknown) {
      toast.error((e as Error).message);
    } finally {
      setPdfLoading(false);
    }
  }

  async function handleSave() {
    const pd = Number(formPayDay);
    if (!pd || pd < 1 || pd > 28) {
      toast.error('Ödeme günü 1–28 arası olmalı');
      return;
    }
    if (formEndDate && formEndDate <= startDate) {
      toast.error('Bitiş tarihi başlangıç tarihinden sonra olmalı');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/contracts/${contractId}`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endDate:    formEndDate || null,
          paymentDay: pd,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Güncelleme başarısız');
      toast.success('Sözleşme güncellendi');
      setEditOpen(false);
      router.refresh();
    } catch (e: unknown) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Card style={{ padding: '20px 24px' }}>
        <p style={{ fontWeight: 600, fontSize: '0.875rem', margin: '0 0 14px', color: 'var(--text)' }}>
          Hızlı İşlemler
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

          <Btn
            variant="ghost"
            style={{ justifyContent: 'flex-start', gap: 8, width: '100%' }}
            onClick={handleViewPdf}
            disabled={viewLoading}
          >
            <FileText size={14} />
            {viewLoading ? 'Yükleniyor...' : 'Sözleşmeyi Görüntüle'}
          </Btn>

          <Btn
            variant="ghost"
            style={{ justifyContent: 'flex-start', gap: 8, width: '100%' }}
            onClick={handleDownloadPdf}
            disabled={pdfLoading}
          >
            <Download size={14} />
            {pdfLoading ? 'Hazırlanıyor...' : 'PDF İndir'}
          </Btn>

          <Btn
            variant="ghost"
            style={{ justifyContent: 'flex-start', gap: 8, width: '100%' }}
            onClick={() => setEditOpen(true)}
          >
            <Pencil size={14} />
            Sözleşmeyi Düzenle
          </Btn>

          <Btn
            variant="ghost"
            style={{ justifyContent: 'flex-start', gap: 8, width: '100%' }}
            onClick={() => router.push(`/contracts/${contractId}#renew`)}
          >
            <TrendingUp size={14} />
            Sözleşme Yenile
          </Btn>

          {outstanding > 0 && (
            <Btn
              style={{ justifyContent: 'flex-start', gap: 8, width: '100%' }}
              onClick={() => setPayOpen(true)}
            >
              <CreditCard size={14} />
              Ödeme Al
              <span style={{
                marginLeft: 'auto', fontSize: '0.75rem', fontFamily: 'ui-monospace, monospace',
              }}>
                ₺{outstanding.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </Btn>
          )}

        </div>
      </Card>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Sözleşmeyi Düzenle" width={440}>
        <ModalBody>
          <FieldRow>
            <Field label="Bitiş Tarihi">
              <DateInput
                value={formEndDate}
                onChange={e => setFormEndDate(e.target.value)}
              />
            </Field>
            <Field label="Ödeme Günü (1–28)" required>
              <NumberInput
                value={formPayDay}
                onChange={e => setFormPayDay(e.target.value)}
                min={1}
                max={28}
                step={1}
              />
            </Field>
          </FieldRow>
        </ModalBody>
        <ModalFooter>
          <Btn variant="ghost" onClick={() => setEditOpen(false)}>İptal</Btn>
          <Btn onClick={handleSave} disabled={saving}>
            {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </Btn>
        </ModalFooter>
      </Modal>

      <PaymentModal
        open={payOpen}
        onClose={() => setPayOpen(false)}
        onSuccess={() => {
          setOutstanding(0);
          router.refresh();
        }}
        endpoint={`/api/contracts/${contractId}/payments`}
        remaining={outstanding}
        label={tenantName}
      />
    </>
  );
}
