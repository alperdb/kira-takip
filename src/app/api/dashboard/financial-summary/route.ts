import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

const TR_MONTHS = ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'];

export async function GET() {
  try {
    const now            = new Date();
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);

    const [totalAgg, monthlyRaw, revenueRaw, overdueRaw] = await Promise.all([
      // Overall totals
      prisma.rentCharge.aggregate({
        _sum: { chargeAmount: true, paidAmount: true },
      }),

      // Monthly alacak + tahsilat (last 12 months)
      prisma.rentCharge.groupBy({
        by: ['periodStart'],
        where: { periodStart: { gte: twelveMonthsAgo } },
        _sum: { chargeAmount: true, paidAmount: true },
        orderBy: { periodStart: 'asc' },
      }),

      // Revenue by building (total paid, all time)
      prisma.$queryRaw<Array<{ title: string; paid: number | bigint }>>`
        SELECT p.title, COALESCE(SUM(rc.paid_amount), 0) AS paid
        FROM rent_charges rc
        JOIN units u ON rc.unit_id = u.id
        JOIN properties p ON u.property_id = p.id
        GROUP BY p.id, p.title
        ORDER BY paid DESC
        LIMIT 10
      `,

      // Overdue by building (current snapshot)
      prisma.$queryRaw<Array<{ title: string; cnt: number | bigint; overdue: number | bigint }>>`
        SELECT p.title,
               COUNT(*) AS cnt,
               COALESCE(SUM(rc.charge_amount - rc.paid_amount), 0) AS overdue
        FROM rent_charges rc
        JOIN units u ON rc.unit_id = u.id
        JOIN properties p ON u.property_id = p.id
        WHERE rc.status = 'overdue'
        GROUP BY p.id, p.title
        ORDER BY overdue DESC
        LIMIT 10
      `,
    ]);

    const totalReceivable = Number(totalAgg._sum.chargeAmount ?? 0);
    const totalCollected  = Number(totalAgg._sum.paidAmount  ?? 0);
    const collectionRate  = totalReceivable > 0
      ? Math.round((totalCollected / totalReceivable) * 100)
      : 0;

    const overdueAmount = overdueRaw.reduce((s, r) => s + Number(r.overdue), 0);
    const overdueCount  = overdueRaw.reduce((s, r) => s + Number(r.cnt),     0);

    const monthlyRentCollection = monthlyRaw.map(m => ({
      month:    TR_MONTHS[new Date(m.periodStart).getMonth()],
      alacak:   Number(m._sum.chargeAmount ?? 0),
      tahsilat: Number(m._sum.paidAmount   ?? 0),
    }));

    const revenueByBuilding = revenueRaw.map(r => ({
      title: r.title,
      paid:  Number(r.paid),
    }));

    const overdueByBuilding = overdueRaw.map(r => ({
      title:   r.title,
      count:   Number(r.cnt),
      overdue: Number(r.overdue),
    }));

    return NextResponse.json({
      monthlyRentCollection,
      totalReceivable,
      totalCollected,
      collectionRate,
      overdueAmount,
      overdueCount,
      revenueByBuilding,
      overdueByBuilding,
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
