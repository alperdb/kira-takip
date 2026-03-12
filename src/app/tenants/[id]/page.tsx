import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/db';
import { Card, Badge } from '@/components/ui';
import { PaymentHistoryCard } from '@/components/PaymentHistoryCard';
import { ArrowLeft, Phone, Mail, CreditCard, MapPin, FileText, TrendingUp } from 'lucide-react';
import { initial, date } from '@/lib/format';

const tryCurrency = (n: number) =>
  '₺' + n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

type Params = { params: Promise<{ id: string }> };

export default async function TenantDetailPage({ params }: Params) {
  const { id } = await params;
  const tenant = await prisma.tenant.findUnique({
    where: { id: Number(id) },
    include: {
      contracts: {
        orderBy: { startDate: 'desc' },
        include: {
          unit: { select: { unitNo: true, property: { select: { title: true } } } },
          _count: { select: { rentCharges: true } },
        },
      },
    },
  });

  if (!tenant) notFound();

  const financials = await prisma.rentCharge.aggregate({
    where: { tenantId: tenant.id, status: { not: 'waived' } },
    _sum: { chargeAmount: true, paidAmount: true },
  });

  const totalCharged = Number(financials._sum.chargeAmount ?? 0);
  const totalPaid    = Number(financials._sum.paidAmount   ?? 0);
  const balance      = totalCharged - totalPaid;

  const activeContract = tenant.contracts.find(c => c.status === 'active');

  return (
    <>
      {/* Back link */}
      <div style={{ marginBottom: 4 }}>
        <Link
          href="/tenants"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontSize: '0.8125rem', color: 'var(--muted)', textDecoration: 'none',
          }}
        >
          <ArrowLeft size={14} />
          Kiracılar
        </Link>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, margin: '8px 0 24px' }}>
        <div style={{
          width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
          background: 'var(--primary-bg)', color: 'var(--primary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.125rem', fontWeight: 700,
        }}>
          {initial(tenant.name)}
        </div>
        <div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--text)', letterSpacing: '-0.02em' }}>
            {tenant.name}
          </h1>
          <p style={{ fontSize: '0.8125rem', color: 'var(--muted)', margin: '2px 0 0' }}>
            {activeContract
              ? `Aktif kiracı · ${activeContract.unit.property.title} ${activeContract.unit.unitNo}`
              : 'Pasif kiracı'}
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 20, alignItems: 'start' }}>

        {/* Sol: Ödeme geçmişi */}
        <PaymentHistoryCard endpoint={`/api/tenants/${tenant.id}/payment-history`} />

        {/* Sağ: Bilgi kartları */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Finansal Özet */}
          <Card style={{ padding: '20px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <TrendingUp size={14} color="var(--muted)" />
              <p style={{ fontWeight: 600, fontSize: '0.875rem', margin: 0, color: 'var(--text)' }}>
                Finansal Özet
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              <FinRow label="Toplam Alacak" value={tryCurrency(totalCharged)} color="var(--text)" />
              <FinRow label="Toplam Tahsilat" value={tryCurrency(totalPaid)} color="var(--green)" />
              <div style={{ borderTop: '1px solid var(--border)', margin: '8px 0' }} />
              <FinRow
                label="Bakiye"
                value={tryCurrency(balance)}
                color={balance > 0 ? 'var(--red)' : 'var(--green)'}
                bold
              />
            </div>
          </Card>

          {/* Kişisel bilgiler */}
          <Card style={{ padding: '20px 24px' }}>
            <p style={{ fontWeight: 600, fontSize: '0.875rem', margin: '0 0 14px', color: 'var(--text)' }}>
              İletişim Bilgileri
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <InfoRow icon={Phone} label={tenant.phone ?? '—'} />
              <InfoRow icon={Mail}  label={tenant.email ?? '—'} />
              {tenant.nationalId && <InfoRow icon={CreditCard} label={tenant.nationalId} />}
              {tenant.address && <InfoRow icon={MapPin} label={tenant.address} />}
            </div>
            {tenant.notes && (
              <p style={{
                marginTop: 12, padding: '8px 10px', borderRadius: 6,
                background: 'var(--surface2)', fontSize: '0.8125rem',
                color: 'var(--muted)', margin: '12px 0 0',
              }}>
                {tenant.notes}
              </p>
            )}
          </Card>

          {/* Sözleşmeler */}
          <Card style={{ padding: '20px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <FileText size={14} color="var(--muted)" />
              <p style={{ fontWeight: 600, fontSize: '0.875rem', margin: 0, color: 'var(--text)' }}>
                Sözleşmeler
              </p>
              <span style={{
                marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--muted)',
                background: 'var(--surface2)', borderRadius: 20,
                padding: '2px 8px', border: '1px solid var(--border)',
              }}>
                {tenant.contracts.length}
              </span>
            </div>

            {tenant.contracts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '8px 0' }}>
                <p style={{ fontSize: '0.875rem', color: 'var(--subtle)', margin: '0 0 6px' }}>
                  Bu kiracıya ait sözleşme yok.
                </p>
                <Link
                  href="/contracts"
                  style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--primary)', textDecoration: 'none' }}
                >
                  Sözleşme Oluştur →
                </Link>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {tenant.contracts.map(c => (
                  <Link
                    key={c.id}
                    href={`/contracts/${c.id}`}
                    style={{ textDecoration: 'none' }}
                  >
                    <div style={{
                      padding: '10px 12px', borderRadius: 8,
                      background: c.status === 'active' ? 'var(--primary-bg)' : 'var(--surface2)',
                      border: `1px solid ${c.status === 'active' ? 'var(--primary-ring)' : 'var(--border)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}>
                      <div>
                        <p style={{ fontSize: '0.8125rem', fontWeight: 600, margin: '0 0 2px', color: 'var(--text)' }}>
                          {c.unit.property.title} · {c.unit.unitNo}
                        </p>
                        <p style={{ fontSize: '0.6875rem', color: 'var(--muted)', margin: 0 }}>
                          {date(c.startDate)} — {c.endDate ? date(c.endDate) : 'belirsiz'}
                        </p>
                      </div>
                      <Badge status={c.status} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Card>

          {/* Meta */}
          <p style={{ fontSize: '0.75rem', color: 'var(--subtle)', textAlign: 'center', margin: 0 }}>
            Kayıt: {date(tenant.createdAt)}
          </p>
        </div>
      </div>
    </>
  );
}

function FinRow({ label, value, color, bold }: { label: string; value: string; color?: string; bold?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0' }}>
      <span style={{ fontSize: '0.8125rem', color: 'var(--muted)' }}>{label}</span>
      <span style={{
        fontSize: '0.8125rem', fontFamily: 'ui-monospace, monospace',
        fontWeight: bold ? 700 : 600, color: color ?? 'var(--text)',
      }}>
        {value}
      </span>
    </div>
  );
}

function InfoRow({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <Icon size={14} color="var(--muted)" strokeWidth={2} style={{ flexShrink: 0 }} />
      <span style={{ fontSize: '0.8125rem', color: 'var(--text)' }}>{label}</span>
    </div>
  );
}
