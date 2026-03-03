'use client';

import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Receipt } from 'lucide-react';
import {
  Card, PageHeader, DataTable, Td, TRow,
  Badge, Money, Btn, EmptyState, TableSkeleton,
  Modal, ModalBody, ModalFooter,
  Field, SectionLabel, Select,
  toast,
} from '@/components/ui';
import { NumberInput } from '@/components/ui';
import { month } from '@/lib/format';

type Charge = {
  id: number; status: string;
  chargeAmount: string; paidAmount: string;
  dueDate: string; periodStart: string;
  tenant: { name: string };
  unit: { unitNo: string; property: { title: string } };
};

const COLS = [
  { label: 'Kiracı'                 },
  { label: 'Daire'                  },
  { label: 'Dönem'                  },
  { label: 'Vade'                   },
  { label: 'Tutar',    right: true  },
  { label: 'Ödenen',   right: true  },
  { label: 'Kalan',    right: true  },
  { label: 'Durum'                  },
  { label: '',                      },
];

export default function ChargesPage() {
  const [charges,    setCharges]    = useState<Charge[]>([]);
  const [filter,     setFilter]     = useState('');
  const [loading,    setLoading]    = useState(true);
  const [generating, setGenerating] = useState(false);

  const [payModal,   setPayModal]   = useState<{ chargeId: number; remaining: number } | null>(null);
  const [payAmount,  setPayAmount]  = useState('');
  const [payMethod,  setPayMethod]  = useState('bank');
  const [payRef,     setPayRef]     = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const qs  = filter ? `?status=${filter}` : '';
    const res = await fetch(`/api/charges${qs}`);
    setCharges(await res.json());
    setLoading(false);
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  async function generate() {
    setGenerating(true);
    await fetch('/api/charges?action=generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: new Date().toISOString() }),
    });
    toast.success('Alacaklar başarıyla oluşturuldu');
    await load();
    setGenerating(false);
  }

  async function submitPayment() {
    if (!payModal || !payAmount) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/charges/${payModal.chargeId}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: Number(payAmount), method: payMethod, referenceNo: payRef }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Hata');
      toast.success('Ödeme başarıyla kaydedildi');
      closeModal();
      load();
    } catch (e: unknown) {
      toast.error((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  function openModal(chargeId: number, remaining: number) {
    setPayModal({ chargeId, remaining });
    setPayAmount(String(remaining));
    setPayMethod('bank');
    setPayRef('');
  }

  function closeModal() {
    setPayModal(null);
    setPayAmount('');
    setPayRef('');
  }

  return (
    <>
      <PageHeader
        title="Alacaklar"
        desc="Kira alacakları ve ödemeler"
        action={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <select
              value={filter}
              onChange={e => setFilter(e.target.value)}
              style={{ width: 'auto', minWidth: 148 }}
              aria-label="Durum filtresi"
            >
              <option value="">Tüm Durumlar</option>
              <option value="pending">Bekliyor</option>
              <option value="partial">Kısmi Ödendi</option>
              <option value="overdue">Gecikti</option>
              <option value="paid">Ödendi</option>
            </select>
            <Btn onClick={generate} disabled={generating}>
              <RefreshCw
                size={14}
                style={generating ? { animation: 'spin 1s linear infinite' } : undefined}
              />
              {generating ? 'Oluşturuluyor...' : 'Alacak Oluştur'}
            </Btn>
          </div>
        }
      />

      <Card>
        {loading ? (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody><TableSkeleton cols={9} rows={6} /></tbody>
          </table>
        ) : charges.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="Alacak bulunamadı"
            desc='Sözleşme oluşturup "Alacak Oluştur" butonuna basın.'
          />
        ) : (
          <DataTable cols={COLS}>
            {charges.map(c => {
              const balance = Number(c.chargeAmount) - Number(c.paidAmount);
              const canPay  = ['pending', 'partial', 'overdue'].includes(c.status);
              return (
                <TRow key={c.id}>
                  <Td><span style={{ fontWeight: 600 }}>{c.tenant.name}</span></Td>
                  <Td muted>{c.unit.property.title} · {c.unit.unitNo}</Td>
                  <Td muted>{month(c.periodStart)}</Td>
                  <Td muted>{new Date(c.dueDate).toLocaleDateString('tr-TR')}</Td>
                  <Td right><Money amount={c.chargeAmount} /></Td>
                  <Td right>
                    <span style={{ fontFamily: 'ui-monospace,monospace', fontWeight: 600, color: 'var(--green)' }}>
                      ₺{Number(c.paidAmount).toLocaleString('tr-TR')}
                    </span>
                  </Td>
                  <Td right>
                    {balance > 0
                      ? <span style={{ fontFamily: 'ui-monospace,monospace', fontWeight: 700, color: c.status === 'overdue' ? 'var(--red)' : 'var(--text)' }}>
                          ₺{balance.toLocaleString('tr-TR')}
                        </span>
                      : <span style={{ color: 'var(--subtle)' }}>—</span>}
                  </Td>
                  <Td><Badge status={c.status} /></Td>
                  <Td>
                    {canPay && (
                      <button
                        onClick={() => openModal(c.id, balance)}
                        aria-label={`${c.tenant.name} için ödeme al`}
                        style={{
                          padding: '4px 12px', borderRadius: 6,
                          fontSize: '0.8125rem', fontWeight: 600,
                          background: 'var(--primary-bg)', color: 'var(--primary)',
                          border: '1px solid var(--primary-ring)', cursor: 'pointer',
                          transition: 'all 0.12s',
                        }}
                      >
                        Ödeme Al
                      </button>
                    )}
                  </Td>
                </TRow>
              );
            })}
          </DataTable>
        )}
      </Card>

      {/* ── Payment Modal ── */}
      <Modal open={!!payModal} onClose={closeModal} title="Ödeme Al" width={420}>
        <ModalBody>
          <SectionLabel>Ödeme Bilgileri</SectionLabel>

          <Field label="Tutar (₺)" required hint={`Kalan: ₺${payModal?.remaining.toLocaleString('tr-TR') ?? ''}`}>
            <NumberInput
              value={payAmount}
              onChange={e => setPayAmount(e.target.value)}
              min={0.01}
              step={0.01}
            />
          </Field>

          <Field label="Ödeme Yöntemi">
            <Select value={payMethod} onChange={e => setPayMethod(e.target.value)}>
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
              value={payRef}
              onChange={e => setPayRef(e.target.value)}
              placeholder="Opsiyonel"
            />
          </Field>
        </ModalBody>

        <ModalFooter>
          <Btn variant="ghost" onClick={closeModal}>İptal</Btn>
          <Btn
            onClick={submitPayment}
            disabled={!payAmount || Number(payAmount) <= 0 || submitting}
          >
            {submitting ? 'Kaydediliyor...' : 'Ödemeyi Kaydet'}
          </Btn>
        </ModalFooter>
      </Modal>
    </>
  );
}
