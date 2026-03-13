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
  const [tab,           setTab]           = useState<'active' | 'terminated'>('active');
  const [selected,      setSelected]      = useState<Set<number>>(new Set());
  const [terminateOpen, setTerminateOpen] = useState(false);
  const [deleteOpen,    setDeleteOpen]    = useState(false);
  const [deleteError,   setDeleteError]   = useState<string | null>(null);
  const [loading,       setLoading]       = useState(false);
  const [pdfLoading,    setPdfLoading]    = useState(false);

  const activeContracts     = contracts.filter(c => c.status === 'active' || c.status === 'renewed');
  const terminatedContracts = contracts.filter(c => c.status !== 'active' && c.status !== 'renewed');
  const visible             = tab === 'active' ? activeContracts : terminatedContracts;

  const allIds        = visible.map(c => c.id);
  const allSelected   = selected.size > 0 && selected.size === allIds.length;
  const indeterminate = selected.size > 0 && selected.size < allIds.length;

  function switchTab(t: 'active' | 'terminated') {
    setTab(t);
    setSelected(new Set());
  }

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
    setDeleteError(null);
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

  async function bulkDelete() {
    setLoading(true);
    try {
      const res  = await fetch('/api/contracts/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [...selected] }),
      });
      const data = await res.json();
      if (!res.ok) {
        setDeleteError(data.error ?? 'Hata');
        return;
      }

      const parts: string[] = [];
      if (data.deleted  > 0) parts.push(`${data.deleted} sözleşme silindi`);
      if (data.archived > 0) parts.push(`${data.archived} sözleşme sonlandırıldı (ödeme geçmişi korundu)`);
      if (data.kept     > 0) parts.push(`${data.kept} kayıt zaten arşivlendi`);
      toast.success(parts.join(' · ') || 'İşlem tamamlandı');

      setSelected(new Set());
      setDeleteOpen(false);
      setDeleteError(null);
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
      {/* ── Tab bar ── */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 14 }}>
        {([
          { key: 'active',     label: 'Aktif',        count: activeContracts.length },
          { key: 'terminated', label: 'Sonlandırılan', count: terminatedContracts.length },
        ] as const).map(t => (
          <button
            key={t.key}
            onClick={() => switchTab(t.key)}
            style={{
              padding: '7px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
              fontSize: '0.875rem', fontWeight: 600,
              background: tab === t.key ? 'var(--primary)' : 'transparent',
              color:      tab === t.key ? '#fff'           : 'var(--muted)',
              transition: 'background 0.12s, color 0.12s',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            {t.label}
            <span style={{
              padding: '1px 7px', borderRadius: 10, fontSize: '0.75rem',
              background: tab === t.key ? 'rgba(255,255,255,0.25)' : 'var(--surface2)',
              color:      tab === t.key ? '#fff' : 'var(--muted)',
            }}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

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
          {tab === 'active' && (
            <Btn variant="outline" onClick={() => setTerminateOpen(true)}>
              <PowerOff size={13} />
              Sonlandır
            </Btn>
          )}
          <Btn variant="destructive" onClick={openDeleteModal}>Sil</Btn>
          <Btn variant="ghost" onClick={() => setSelected(new Set())}>İptal</Btn>
        </div>
      )}

      {/* ── Table ── */}
      <Card>
        {visible.length === 0 ? (
          <EmptyState
            icon={FileText}
            title={tab === 'active' ? 'Aktif sözleşme yok' : 'Sonlandırılan sözleşme yok'}
            desc={tab === 'active' ? 'Kiracı ve boş daire eşleştirerek kira sözleşmesi oluşturun.' : 'Sonlandırılan sözleşme bulunamadı.'}
            action={tab === 'active' ? (
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <Link href="/tenants" style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--primary)', textDecoration: 'none' }}>Kiracı Ekle →</Link>
                <span style={{ color: 'var(--border)' }}>|</span>
                <Link href="/units" style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--primary)', textDecoration: 'none' }}>Daire Ekle →</Link>
              </div>
            ) : undefined}
          />
        ) : (
          <DataTable cols={cols}>
            {visible.map(c => {
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
        onClose={() => { if (!loading) { setDeleteOpen(false); setDeleteError(null); } }}
        title="Sözleşmeleri Temizle"
        width={480}
      >
        <ModalBody>
          <p style={{ fontSize: '0.9375rem', color: 'var(--text)', lineHeight: 1.6 }}>
            Seçili <strong>{selected.size} sözleşmede</strong> şu işlem uygulanacak:
          </p>
          <ul style={{ margin: '10px 0 0', paddingLeft: 20, fontSize: '0.875rem', color: 'var(--muted)', lineHeight: 1.8 }}>
            <li>Ödeme kaydı <strong>olmayan</strong> sözleşmeler → <span style={{ color: 'var(--red)' }}>kalıcı olarak silinir</span></li>
            <li>Ödeme kaydı <strong>olan aktif</strong> sözleşmeler → <span style={{ color: 'var(--amber)' }}>sonlandırılır (mali geçmiş korunur)</span></li>
            <li>Zaten sonlandırılmış olanlar → <span style={{ color: 'var(--muted)' }}>değiştirilmez</span></li>
          </ul>

          {deleteError && (
            <div style={{
              marginTop: 14, padding: '10px 14px', borderRadius: 8,
              background: 'rgba(220,74,74,0.08)', border: '1px solid rgba(220,74,74,0.25)',
            }}>
              <p style={{ fontSize: '0.875rem', color: 'var(--red)', fontWeight: 600, margin: 0 }}>
                {deleteError}
              </p>
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Btn
            variant="ghost"
            onClick={() => { setDeleteOpen(false); setDeleteError(null); }}
            disabled={loading}
          >
            İptal
          </Btn>
          <Btn variant="destructive" onClick={bulkDelete} disabled={loading}>
            {loading ? 'İşleniyor...' : 'Uygula'}
          </Btn>
        </ModalFooter>
      </Modal>
    </>
  );
}
