'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FileText, PowerOff, FileDown } from 'lucide-react';
import {
  Card, DataTable, Td, TRow, EmptyState, Badge, Money,
  Modal, ModalBody, ModalFooter, Btn, toast,
} from '@/components/ui';
import { ContractEditModal } from './ContractEditModal';
import { ContractRenewModal } from './ContractRenewModal';
import { ContractPdfButton } from './ContractPdfButton';

// ── Types ────────────────────────────────────────────────────────
type ContractRow = {
  id:            number;
  unitId:        number;
  tenantId:      number;
  startDate:     string;
  endDate:       string | null;
  rentAmount:    number | string;
  currentRent:   number | string | null;
  depositAmount: number | string;
  paymentDay:    number;
  status:        string;
  bankName:      string | null;
  iban:          string | null;
  accountHolder: string | null;
  unit:          { unitNo: string; property: { title: string } };
  tenant:        { name: string; phone: string | null };
};

type UnitOption   = { id: number; unitNo: string; property: { title: string } };
type TenantOption = { id: number; name: string };

interface Props {
  contracts: ContractRow[];
  allUnits:  UnitOption[];
  tenants:   TenantOption[];
}

// ── Custom checkbox ──────────────────────────────────────────────
function CheckBox({
  checked, indeterminate = false, onChange,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: () => void;
}) {
  const active = checked || indeterminate;
  return (
    <label style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      cursor: 'pointer', lineHeight: 0, userSelect: 'none',
    }}>
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 0, height: 0 }}
      />
      <div style={{
        width: 16, height: 16, borderRadius: 4, flexShrink: 0,
        border: `1.5px solid ${active ? 'var(--primary)' : 'var(--border)'}`,
        background: active ? 'var(--primary)' : 'var(--surface)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'background 0.12s, border-color 0.12s',
      }}>
        {checked && (
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
            <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
        {indeterminate && !checked && (
          <div style={{ width: 8, height: 1.5, background: '#fff', borderRadius: 1 }} />
        )}
      </div>
    </label>
  );
}

// ── Main component ───────────────────────────────────────────────
export function ContractsTable({ contracts, allUnits, tenants }: Props) {
  const router = useRouter();
  const [selected,        setSelected]        = useState<Set<number>>(new Set());
  const [terminateOpen,   setTerminateOpen]   = useState(false);
  const [deleteOpen,      setDeleteOpen]      = useState(false);
  const [deleteHasCharges,  setDeleteHasCharges]  = useState(false);
  const [deleteHasPayments, setDeleteHasPayments] = useState(false);
  const [deleteChargesMsg,  setDeleteChargesMsg]  = useState('');
  const [loading,         setLoading]         = useState(false);
  const [pdfLoading,      setPdfLoading]      = useState(false);

  const allIds        = contracts.map(c => c.id);
  const allSelected   = selected.size > 0 && selected.size === allIds.length;
  const indeterminate = selected.size > 0 && selected.size < allIds.length;

  function toggleAll() {
    setSelected(allSelected || indeterminate ? new Set() : new Set(allIds));
  }

  function toggleOne(id: number) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function openDeleteModal() {
    setDeleteHasCharges(false);
    setDeleteHasPayments(false);
    setDeleteChargesMsg('');
    setDeleteOpen(true);
  }

  async function bulkTerminate() {
    setLoading(true);
    try {
      const res  = await fetch('/api/contracts/bulk-terminate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [...selected] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Hata');
      toast.success(`${data.count} sözleşme sonlandırıldı`);
      setSelected(new Set());
      setTerminateOpen(false);
      router.refresh();
    } catch (e: unknown) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function bulkDelete(force = false) {
    setLoading(true);
    try {
      const res  = await fetch('/api/contracts/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [...selected], force }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.code === 'HAS_PAYMENTS') {
          setDeleteHasPayments(true);
          setDeleteChargesMsg(data.error);
          return;
        }
        if (data.code === 'HAS_CHARGES') {
          setDeleteHasCharges(true);
          setDeleteChargesMsg(data.error);
          return;
        }
        throw new Error(data.error ?? 'Hata');
      }
      toast.success(`${data.count} sözleşme silindi`);
      setSelected(new Set());
      setDeleteOpen(false);
      setDeleteHasCharges(false);
      setDeleteHasPayments(false);
      router.refresh();
    } catch (e: unknown) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function bulkGeneratePdf() {
    setPdfLoading(true);
    const ids = [...selected];
    let failed = 0;
    for (const id of ids) {
      try {
        const res = await fetch(`/api/contracts/${id}/pdf`);
        if (!res.ok) { failed++; continue; }
        const blob = await res.blob();
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = `sozlesme-${id}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      } catch {
        failed++;
      }
    }
    setPdfLoading(false);
    if (failed > 0) toast.error(`${failed} PDF oluşturulamadı`);
    else toast.success(`${ids.length} PDF indirildi`);
  }

  const cols = [
    {
      label: <div style={{ marginTop: 3 }}><CheckBox checked={allSelected} indeterminate={indeterminate} onChange={toggleAll} /></div>,
      w: 48, center: true, p: '10px 0',
    },
    { label: 'Daire'                           },
    { label: 'Kiracı'                          },
    { label: 'Başlangıç',  w: 104              },
    { label: 'Bitiş',      w: 104              },
    { label: 'Kira / Ay',  right: true, w: 120 },
    { label: 'Depozito',   right: true, w: 112 },
    { label: 'Durum',      w: 96               },
    { label: '', w: 248, p: '10px 16px 10px 8px' }, // actions col — 16px right padding
  ];

  return (
    <>
      {/* ── Bulk action bar ── */}
      {selected.size > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 16px',
          background: 'var(--primary-bg)',
          border: '1px solid var(--primary-ring)',
          borderRadius: 10,
          marginBottom: 12,
        }}>
          <span style={{ flex: 1, fontSize: '0.875rem', fontWeight: 600, color: 'var(--primary)' }}>
            {selected.size} sözleşme seçildi
          </span>
          <Btn variant="outline" onClick={bulkGeneratePdf} disabled={pdfLoading}>
            <FileDown size={13} />
            {pdfLoading ? 'İndiriliyor...' : 'PDF Oluştur'}
          </Btn>
          <Btn variant="outline" onClick={() => setTerminateOpen(true)}>
            <PowerOff size={13} />
            Sonlandır
          </Btn>
          <Btn variant="destructive" onClick={openDeleteModal}>Sil</Btn>
          <Btn variant="ghost" onClick={() => setSelected(new Set())}>İptal</Btn>
        </div>
      )}

      {/* ── Table ── */}
      <Card>
        {contracts.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="Henüz sözleşme yok"
            desc="Kiracı ve boş daire eşleştirerek kira sözleşmesi oluşturun."
            action={
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <Link href="/tenants" style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--primary)', textDecoration: 'none' }}>Kiracı Ekle →</Link>
                <span style={{ color: 'var(--border)' }}>|</span>
                <Link href="/units" style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--primary)', textDecoration: 'none' }}>Daire Ekle →</Link>
              </div>
            }
          />
        ) : (
          <DataTable cols={cols}>
            {contracts.map(c => {
              const startStr = new Date(c.startDate).toISOString().split('T')[0];
              const endStr   = c.endDate ? new Date(c.endDate).toISOString().split('T')[0] : null;
              const isActive = c.status === 'active';

              return (
                <TRow key={c.id}>
                  {/* Checkbox */}
                  <Td action>
                    <CheckBox
                      checked={selected.has(c.id)}
                      onChange={() => toggleOne(c.id)}
                    />
                  </Td>

                  {/* Data */}
                  <Td>
                    <div style={{ fontWeight: 600 }}>{c.unit.unitNo}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{c.unit.property.title}</div>
                  </Td>
                  <Td>
                    <div style={{ fontWeight: 500 }}>{c.tenant.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{c.tenant.phone ?? ''}</div>
                  </Td>
                  <Td muted>{new Date(c.startDate).toLocaleDateString('tr-TR')}</Td>
                  <Td muted>{c.endDate ? new Date(c.endDate).toLocaleDateString('tr-TR') : '—'}</Td>
                  <Td right><Money amount={Number(c.currentRent ?? c.rentAmount)} /></Td>
                  <Td right>
                    {Number(c.depositAmount) > 0
                      ? <Money amount={Number(c.depositAmount)} />
                      : <span style={{ color: 'var(--subtle)' }}>—</span>}
                  </Td>
                  <Td><Badge status={c.status} /></Td>

                  {/* Actions — right-aligned, 16px from edge, Yenile slot always reserved */}
                  <td style={{
                    padding: '0 16px 0 8px',
                    verticalAlign: 'middle',
                    whiteSpace: 'nowrap',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                      <div style={{ visibility: isActive ? 'visible' : 'hidden' }}>
                        <ContractRenewModal
                          contractId={c.id}
                          currentRent={Number(c.currentRent ?? c.rentAmount)}
                          currentEndDate={endStr}
                          label={`${c.unit.unitNo} — ${c.tenant.name}`}
                        />
                      </div>
                      <ContractEditModal
                        contract={{
                          id:            c.id,
                          unitId:        c.unitId,
                          tenantId:      c.tenantId,
                          startDate:     startStr,
                          endDate:       endStr,
                          rentAmount:    Number(c.rentAmount),
                          depositAmount: Number(c.depositAmount),
                          paymentDay:    c.paymentDay,
                          bankName:      c.bankName,
                          iban:          c.iban,
                          accountHolder: c.accountHolder,
                        }}
                        allUnits={allUnits}
                        allTenants={tenants}
                      />
                      <ContractPdfButton contractId={c.id} />
                    </div>
                  </td>
                </TRow>
              );
            })}
          </DataTable>
        )}
      </Card>

      {/* ── Terminate confirmation ── */}
      <Modal
        open={terminateOpen}
        onClose={() => !loading && setTerminateOpen(false)}
        title="Sözleşmeleri Sonlandır"
        width={420}
      >
        <ModalBody>
          <p style={{ fontSize: '0.9375rem', color: 'var(--text)', lineHeight: 1.6 }}>
            Seçili <strong>{selected.size} sözleşmeyi</strong> sonlandırmak üzeresiniz.
          </p>
          <p style={{ fontSize: '0.875rem', color: 'var(--muted)', marginTop: 8 }}>
            Sözleşme durumu &quot;Sonlandırıldı&quot; olarak güncellenir ve ilgili daireler boş olarak işaretlenir.
          </p>
        </ModalBody>
        <ModalFooter>
          <Btn variant="ghost" onClick={() => setTerminateOpen(false)} disabled={loading}>İptal</Btn>
          <Btn variant="destructive" onClick={bulkTerminate} disabled={loading}>
            {loading ? 'Sonlandırılıyor...' : 'Evet, Sonlandır'}
          </Btn>
        </ModalFooter>
      </Modal>

      {/* ── Delete confirmation ── */}
      <Modal
        open={deleteOpen}
        onClose={() => { if (!loading) { setDeleteOpen(false); setDeleteHasCharges(false); setDeleteHasPayments(false); } }}
        title="Sözleşmeleri Sil"
        width={460}
      >
        <ModalBody>
          <p style={{ fontSize: '0.9375rem', color: 'var(--text)', lineHeight: 1.6 }}>
            Seçili <strong>{selected.size} sözleşmeyi</strong> silmek üzeresiniz.
          </p>

          {deleteHasPayments ? (
            <div style={{
              marginTop: 12, padding: '10px 14px', borderRadius: 8,
              background: 'rgba(220,74,74,0.08)', border: '1px solid rgba(220,74,74,0.25)',
            }}>
              <p style={{ fontSize: '0.875rem', color: 'var(--red)', fontWeight: 600, margin: '0 0 4px' }}>
                Silme engellendi — ödeme geçmişi korunuyor
              </p>
              <p style={{ fontSize: '0.8125rem', color: 'var(--muted)', margin: 0 }}>
                {deleteChargesMsg}
              </p>
            </div>
          ) : deleteHasCharges ? (
            <div style={{
              marginTop: 12, padding: '10px 14px', borderRadius: 8,
              background: 'rgba(220,74,74,0.08)', border: '1px solid rgba(220,74,74,0.25)',
            }}>
              <p style={{ fontSize: '0.875rem', color: 'var(--red)', fontWeight: 600, margin: '0 0 4px' }}>
                Bağlı alacak kayıtları var
              </p>
              <p style={{ fontSize: '0.8125rem', color: 'var(--muted)', margin: 0 }}>
                {deleteChargesMsg}
              </p>
            </div>
          ) : (
            <p style={{ fontSize: '0.875rem', color: 'var(--red)', marginTop: 8, fontWeight: 500 }}>
              Bu işlem geri alınamaz.
            </p>
          )}
        </ModalBody>
        <ModalFooter>
          <Btn
            variant="ghost"
            onClick={() => { setDeleteOpen(false); setDeleteHasCharges(false); setDeleteHasPayments(false); }}
            disabled={loading}
          >
            {deleteHasPayments ? 'Kapat' : 'İptal'}
          </Btn>
          {!deleteHasPayments && (
            deleteHasCharges ? (
              <Btn variant="destructive" onClick={() => bulkDelete(true)} disabled={loading}>
                {loading ? 'Siliniyor...' : 'Yine de Sil'}
              </Btn>
            ) : (
              <Btn variant="destructive" onClick={() => bulkDelete(false)} disabled={loading}>
                {loading ? 'Siliniyor...' : 'Evet, Sil'}
              </Btn>
            )
          )}
        </ModalFooter>
      </Modal>
    </>
  );
}
