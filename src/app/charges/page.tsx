'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { RefreshCw, Receipt } from 'lucide-react';

type Owner = { id: number; name: string };
import {
  Card, PageHeader, DataTable, Td, TRow,
  Badge, Money, Btn, EmptyState, TableSkeleton,
  toast,
} from '@/components/ui';
import { DeleteButton } from '@/components/DeleteButton';
import { PaymentModal } from '@/components/PaymentModal';
import { month } from '@/lib/format';

type Charge = {
  id: number; status: string;
  chargeAmount: string; paidAmount: string;
  dueDate: string; periodStart: string;
  tenant: { name: string };
  unit: { unitNo: string; property: { title: string } };
  contract: { currency: string };
  exchangeRate:    number | null;
  chargeAmountTry: number | null;
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
  { label: '', w: 200               },
];

export default function ChargesPage() {
  const [charges,    setCharges]    = useState<Charge[]>([]);
  const [filter,     setFilter]     = useState('');
  const [ownerId,    setOwnerId]    = useState('');
  const [owners,     setOwners]     = useState<Owner[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [generating, setGenerating] = useState(false);

  const [payModal, setPayModal] = useState<{ chargeId: number; remaining: number; label: string } | null>(null);

  useEffect(() => {
    fetch('/api/owners').then(r => r.json()).then(setOwners).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filter)  params.set('status',  filter);
    if (ownerId) params.set('ownerId', ownerId);
    const qs  = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`/api/charges${qs}`);
    setCharges(await res.json());
    setLoading(false);
  }, [filter, ownerId]);

  useEffect(() => { load(); }, [load]);

  async function generate() {
    setGenerating(true);
    try {
      const res = await fetch('/api/charges?action=generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: new Date().toISOString() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Hata');
      toast.success(`${data.created} alacak oluşturuldu`);
      await load();
    } catch (e: unknown) {
      toast.error((e as Error).message);
    } finally {
      setGenerating(false);
    }
  }

  function openModal(chargeId: number, remaining: number, label: string) {
    setPayModal({ chargeId, remaining, label });
  }

  return (
    <>
      <PageHeader
        title="Alacaklar"
        desc="Kira alacakları ve ödemeler"
        action={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {owners.length > 1 && (
              <select
                value={ownerId}
                onChange={e => setOwnerId(e.target.value)}
                style={{ width: 'auto', minWidth: 160 }}
                aria-label="Sahip filtresi"
              >
                <option value="">Tüm Sahipler</option>
                {owners.map(o => (
                  <option key={o.id} value={String(o.id)}>{o.name}</option>
                ))}
              </select>
            )}
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
            title={filter ? 'Bu filtreye ait alacak yok' : 'Henüz alacak kaydı yok'}
            desc={filter ? 'Farklı bir durum filtresi deneyin.' : 'Aktif sözleşmeleriniz için yukarıdaki "Alacak Oluştur" butonuna tıklayın.'}
            action={!filter
              ? <Link href="/contracts" style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--primary)', textDecoration: 'none' }}>Sözleşmelere Git →</Link>
              : undefined}
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
                  <Td right>
                    {c.chargeAmountTry != null && c.exchangeRate != null ? (
                      <div style={{ textAlign: 'right' }}>
                        <Money amount={c.chargeAmountTry} />
                        <div style={{
                          fontSize: '0.7rem', color: 'var(--subtle)', marginTop: 2,
                          fontFamily: 'ui-monospace, monospace',
                        }}>
                          {Number(c.chargeAmount).toLocaleString('tr-TR')} {c.contract.currency}
                          {' @ '}{c.exchangeRate.toLocaleString('tr-TR', { minimumFractionDigits: 4 })}
                        </div>
                      </div>
                    ) : (
                      <Money amount={c.chargeAmount} />
                    )}
                  </Td>
                  <Td right>
                    <span style={{ fontFamily: 'ui-monospace,monospace', fontWeight: 600, color: 'var(--green)' }}>
                      ₺{Number(c.paidAmount).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </Td>
                  <Td right>
                    {balance > 0
                      ? <span style={{ fontFamily: 'ui-monospace,monospace', fontWeight: 700, color: c.status === 'overdue' ? 'var(--red)' : 'var(--text)' }}>
                          ₺{balance.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      : <span style={{ color: 'var(--subtle)' }}>—</span>}
                  </Td>
                  <Td><Badge status={c.status} /></Td>
                  <Td action>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end', padding: '0 8px' }}>
                      {canPay && (
                        <button
                          onClick={() => openModal(c.id, balance, `${c.tenant.name} — ${c.unit.property.title} · ${c.unit.unitNo}`)}
                          aria-label={`${c.tenant.name} için ödeme al`}
                          style={{
                            height: 30, padding: '0 14px', borderRadius: 6,
                            fontSize: '0.8125rem', fontWeight: 600,
                            background: 'var(--primary)', color: '#fff',
                            border: 'none', cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            transition: 'all 0.12s',
                          }}
                        >
                          Ödeme Al
                        </button>
                      )}
                      <DeleteButton
                        endpoint={`/api/charges/${c.id}`}
                        label={`${c.tenant.name} — ${c.unit.unitNo}`}
                        onDeleted={load}
                        warningText="Alacak silinir. Ödeme kaydı olan alacaklar silinemez."
                      />
                    </div>
                  </Td>
                </TRow>
              );
            })}
          </DataTable>
        )}
      </Card>

      {payModal && (
        <PaymentModal
          open={!!payModal}
          onClose={() => setPayModal(null)}
          onSuccess={load}
          endpoint={`/api/charges/${payModal.chargeId}/payments`}
          remaining={payModal.remaining}
          label={payModal.label}
        />
      )}
    </>
  );
}
