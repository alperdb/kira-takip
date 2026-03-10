import { prisma } from '@/lib/db';
import { PageHeader, Card } from '@/components/ui';
import { KpiCard } from '@/components/dashboard/KpiCard';
import { ChartCard, type MonthlyPoint } from '@/components/dashboard/ChartCard';
import { BudgetSummary } from '@/components/dashboard/BudgetSummary';
import { DonutChart } from '@/components/dashboard/DonutChart';
import { OverdueList } from '@/components/dashboard/OverdueList';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { RateBand } from '@/components/dashboard/RateBand';
import { UpcomingPayments } from '@/components/dashboard/UpcomingPayments';
import { ExpiringContracts } from '@/components/dashboard/ExpiringContracts';
import { DollarSign, BarChart3, AlertTriangle, Home } from 'lucide-react';

const TR_MONTHS = ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'];

async function getData() {
  const now        = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const sixMonAgo  = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const [
    unitCount, vacantCount, occupiedCount,
    overdueCharges,
    thisMonthCharged, thisMonthPaid,
    thisMonthExpenses,
    monthlyRaw,
  ] = await Promise.all([
    prisma.unit.count(),
    prisma.unit.count({ where: { status: 'vacant' } }),
    prisma.unit.count({ where: { status: 'occupied' } }),
    prisma.rentCharge.findMany({
      where: { status: 'overdue' },
      include: {
        tenant:   { select: { name: true } },
        unit:     { select: { unitNo: true, property: { select: { title: true } } } },
        contract: { select: { id: true } },
      },
      orderBy: { dueDate: 'asc' },
      take: 10,
    }),
    prisma.rentCharge.aggregate({
      where: { periodStart: { gte: monthStart } },
      _sum: { chargeAmount: true },
    }),
    prisma.rentCharge.aggregate({
      where: { periodStart: { gte: monthStart } },
      _sum: { paidAmount: true },
    }),
    prisma.expense.aggregate({
      where: { date: { gte: monthStart } },
      _sum: { amount: true },
    }),
    prisma.rentCharge.groupBy({
      by: ['periodStart'],
      where: { periodStart: { gte: sixMonAgo } },
      _sum: { chargeAmount: true, paidAmount: true },
      orderBy: { periodStart: 'asc' },
    }),
  ]);

  const charged     = Number(thisMonthCharged._sum.chargeAmount ?? 0);
  const paid        = Number(thisMonthPaid._sum.paidAmount ?? 0);
  const expenses    = Number(thisMonthExpenses._sum.amount ?? 0);
  const outstanding = overdueCharges.reduce(
    (s, c) => s + Number(c.chargeAmount) - Number(c.paidAmount), 0
  );
  const occupancy = unitCount > 0 ? Math.round((occupiedCount / unitCount) * 100) : 0;

  const chartData: MonthlyPoint[] = monthlyRaw.map(m => ({
    month:     TR_MONTHS[new Date(m.periodStart).getMonth()],
    alacak:    Number(m._sum.chargeAmount ?? 0),
    tahsilat:  Number(m._sum.paidAmount   ?? 0),
  }));

  return {
    unitCount, vacantCount, charged, paid, expenses, outstanding, occupancy,
    overdueCharges, chartData,
  };
}

// ── Legend dot ──────────────────────────────────────────
function ChartLegend({ color, label }: { color: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8125rem', color: 'var(--muted)' }}>
      <div style={{ width: 10, height: 3, borderRadius: 2, background: color }} />
      {label}
    </div>
  );
}

// ── Page ────────────────────────────────────────────────
export default async function Dashboard() {
  const d   = await getData();
  const fmt = (n: number) => `₺${n.toLocaleString('tr-TR')}`;

  const now       = new Date();
  const monthName = now.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });
  const collectPct = d.charged > 0 ? Math.round((d.paid / d.charged) * 100) : 0;

  return (
    <>
      <PageHeader
        title="Dashboard"
        desc={`Genel bakış — ${monthName}`}
      />

      {/* ── Kur Bandı ── */}
      <RateBand />

      {/* ── KPI Row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <KpiCard
          icon={DollarSign}
          label="Bu Ay Alacak"
          value={fmt(d.charged)}
          color="blue"
        />
        <KpiCard
          icon={BarChart3}
          label="Bu Ay Tahsilat"
          value={fmt(d.paid)}
          color="green"
          trend="up"
          sub={`%${collectPct} tahsil edildi`}
        />
        <KpiCard
          icon={AlertTriangle}
          label="Toplam Gecikme"
          value={fmt(d.outstanding)}
          color="red"
          trend={d.outstanding > 0 ? 'down' : undefined}
          sub={`${d.overdueCharges.length} geciken alacak`}
        />
        <KpiCard
          icon={Home}
          label="Doluluk"
          value={`%${d.occupancy}`}
          color="amber"
          sub={`${d.unitCount - d.vacantCount} / ${d.unitCount} daire dolu`}
        />
      </div>

      {/* ── Budget Summary ── */}
      <BudgetSummary gelir={d.paid} gider={d.expenses} />

      {/* ── Chart + Donut + Quick Actions ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 220px 360px', gap: 16, alignItems: 'stretch' }}>
        <Card>
          <div style={{
            padding: '20px 24px 0',
            display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          }}>
            <div>
              <p style={{ fontWeight: 600, fontSize: '0.9375rem', margin: '0 0 2px', color: 'var(--text)' }}>
                Alacak & Tahsilat
              </p>
              <p style={{ fontSize: '0.8125rem', color: 'var(--muted)', margin: 0 }}>Son 6 ay</p>
            </div>
            <div style={{ display: 'flex', gap: 16, paddingTop: 4 }}>
              <ChartLegend color="var(--primary)" label="Alacak" />
              <ChartLegend color="var(--green)"   label="Tahsilat" />
            </div>
          </div>
          <div style={{ padding: '16px 16px 20px' }}>
            <ChartCard data={d.chartData} />
          </div>
        </Card>

        {/* Donut chart */}
        <Card>
          <div style={{ padding: '20px 20px 0' }}>
            <p style={{ fontWeight: 600, fontSize: '0.9375rem', margin: '0 0 2px', color: 'var(--text)' }}>
              {d.expenses > 0 ? 'Gelir & Gider' : 'Tahsilat vs Bekleyen'}
            </p>
            <p style={{ fontSize: '0.8125rem', color: 'var(--muted)', margin: 0 }}>Bu ay</p>
          </div>
          <div style={{ height: 260, padding: '16px 16px 20px' }}>
            <DonutChart gelir={d.paid} gider={d.expenses} outstanding={d.outstanding} />
          </div>
          {/* Legend */}
          <div style={{
            display: 'flex', gap: 14, padding: '0 20px 18px',
            justifyContent: 'center',
          }}>
            {d.expenses > 0 ? (
              <>
                <ChartLegend color="var(--primary)" label="Gelir" />
                <ChartLegend color="var(--red)"     label="Gider" />
              </>
            ) : (
              <>
                <ChartLegend color="var(--green)"   label="Tahsilat" />
                <ChartLegend color="var(--amber)"   label="Bekleyen" />
              </>
            )}
          </div>
        </Card>

        <QuickActions charged={d.charged} paid={d.paid} />
      </div>

      {/* ── Bottom widgets ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, alignItems: 'start' }}>
        <OverdueList charges={d.overdueCharges} />
        <UpcomingPayments />
        <ExpiringContracts />
      </div>
    </>
  );
}
