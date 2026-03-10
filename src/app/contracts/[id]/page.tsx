import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { Card, PageHeader, Badge } from '@/components/ui';
import { RentIncreaseForm } from './RentIncreaseForm';
import { ContractRenewForm } from './ContractRenewForm';
import { getEffectiveRentAmount } from '@/lib/charges';
import { ContractQuickActions } from './ContractQuickActions';
import { PaymentHistoryCard } from '@/components/PaymentHistoryCard';
import { ArrowLeft, TrendingUp } from 'lucide-react';

type Params = { params: Promise<{ id: string }> };

const TYPE_LABELS: Record<string, string> = {
  monthly_tufe: 'Aylık TÜFE',
  avg12_tufe:   '12A Ort. TÜFE',
  manual:       'Manuel',
};

export default async function ContractDetailPage({ params }: Params) {
  const { id } = await params;
  const contract = await prisma.contract.findUnique({
    where: { id: Number(id) },
    include: {
      unit:      { select: { unitNo: true, property: { select: { title: true } } } },
      tenant:    { select: { name: true, phone: true } },
      increases: { orderBy: { effectiveDate: 'desc' } },
    },
  });

  if (!contract) notFound();

  const effectiveRent = await getEffectiveRentAmount(contract.id, new Date());

  return (
    <>
      <div style={{ marginBottom: 4 }}>
        <Link
          href="/contracts"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontSize: '0.8125rem', color: 'var(--muted)', textDecoration: 'none',
          }}
        >
          <ArrowLeft size={14} />
          Sözleşmeler
        </Link>
      </div>

      <PageHeader
        title="Sözleşme Yenile"
        desc={`${contract.unit.property.title} · ${contract.unit.unitNo} — ${contract.tenant.name}`}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 20, alignItems: 'start' }}>

        {/* Sol: Artış formu + Yenileme formu + Ödeme geçmişi */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <RentIncreaseForm
            contractId={contract.id}
            currentRent={effectiveRent}
          />
          <ContractRenewForm
            contractId={contract.id}
            currentRent={effectiveRent}
            currentEndDate={contract.endDate?.toISOString().split('T')[0]}
          />
          <PaymentHistoryCard endpoint={`/api/contracts/${contract.id}/payment-history`} />
        </div>

        {/* Sağ: Quick actions + özet + geçmiş */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <ContractQuickActions
            contractId={contract.id}
            endDate={contract.endDate?.toISOString().split('T')[0]}
            paymentDay={contract.paymentDay}
            tenantName={contract.tenant.name}
          />

          {/* Sözleşme özeti */}
          <Card style={{ padding: '20px 24px' }}>
            <p style={{ fontWeight: 600, fontSize: '0.9375rem', margin: '0 0 14px', color: 'var(--text)' }}>
              Sözleşme Bilgileri
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <SummaryRow label="Kiracı"    value={contract.tenant.name} />
              <SummaryRow label="Daire"     value={`${contract.unit.property.title} · ${contract.unit.unitNo}`} />
              <SummaryRow label="Başlangıç" value={new Date(contract.startDate).toLocaleDateString('tr-TR')} />
              {contract.endDate && (
                <SummaryRow label="Bitiş" value={new Date(contract.endDate).toLocaleDateString('tr-TR')} />
              )}
              <SummaryRow label="Durum" value={<Badge status={contract.status} />} />
              <SummaryRow
                label="Mevcut Kira"
                value={
                  <span style={{ fontFamily: 'ui-monospace, monospace', fontWeight: 700, color: 'var(--text)' }}>
                    ₺{effectiveRent.toLocaleString('tr-TR')}
                  </span>
                }
              />
            </div>
          </Card>

          {/* Kira artış geçmişi */}
          <Card style={{ padding: '20px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <TrendingUp size={14} color="var(--green)" />
              <p style={{ fontWeight: 600, fontSize: '0.875rem', margin: 0, color: 'var(--text)' }}>
                Kira Artış Geçmişi
              </p>
              {contract.increases.length > 0 && (
                <span style={{
                  marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--muted)',
                  background: 'var(--surface2)', borderRadius: 20,
                  padding: '2px 8px', border: '1px solid var(--border)',
                }}>
                  {contract.increases.length} kayıt
                </span>
              )}
            </div>

            {contract.increases.length === 0 ? (
              <p style={{ color: 'var(--subtle)', fontSize: '0.875rem', margin: 0, textAlign: 'center' }}>
                Henüz kira artışı uygulanmamış.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {contract.increases.map((inc, i) => (
                  <IncreaseRow key={inc.id} increase={inc} isLatest={i === 0} />
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}

// ── Yardımcı bileşenler ──────────────────────────────────────

function SummaryRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
      <span style={{ fontSize: '0.8125rem', color: 'var(--muted)', flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: '0.8125rem', color: 'var(--text)', textAlign: 'right' }}>{value}</span>
    </div>
  );
}

type IncreaseRecord = {
  id:             number;
  effectiveDate:  Date;
  oldAmount:      number;
  newAmount:      number;
  increaseAmount: number | null;
  increaseType:   string;
  ratePercent:    number | null;
};

function IncreaseRow({ increase: inc, isLatest }: { increase: IncreaseRecord; isLatest: boolean }) {
  const increaseAmount = inc.increaseAmount ?? (Number(inc.newAmount) - Number(inc.oldAmount));

  return (
    <div style={{
      padding: '10px 12px', borderRadius: 8,
      background: isLatest ? 'var(--primary-bg)' : 'var(--surface2)',
      border: `1px solid ${isLatest ? 'var(--primary)' : 'var(--border)'}`,
      display: 'flex', flexDirection: 'column', gap: 6,
    }}>
      {/* Üst satır: tip + oran + tarih */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: isLatest ? 'var(--primary)' : 'var(--muted)' }}>
          {TYPE_LABELS[inc.increaseType] ?? inc.increaseType}
          {inc.ratePercent != null && ` · %${Number(inc.ratePercent).toLocaleString('tr-TR')}`}
        </span>
        <span style={{ fontSize: '0.75rem', color: 'var(--subtle)' }}>
          {new Date(inc.effectiveDate).toLocaleDateString('tr-TR')}
        </span>
      </div>

      {/* Alt satır: eski → yeni + artış miktarı */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            fontFamily: 'ui-monospace, monospace', fontSize: '0.8125rem',
            color: 'var(--muted)', textDecoration: 'line-through',
          }}>
            ₺{Number(inc.oldAmount).toLocaleString('tr-TR')}
          </span>
          <span style={{ color: 'var(--subtle)', fontSize: '0.75rem' }}>→</span>
          <span style={{
            fontFamily: 'ui-monospace, monospace', fontSize: '0.875rem',
            fontWeight: 700, color: 'var(--green)',
          }}>
            ₺{Number(inc.newAmount).toLocaleString('tr-TR')}
          </span>
        </div>
        <span style={{
          fontFamily: 'ui-monospace, monospace', fontSize: '0.75rem',
          color: 'var(--primary)', fontWeight: 600,
        }}>
          +₺{increaseAmount.toLocaleString('tr-TR')}
        </span>
      </div>
    </div>
  );
}
