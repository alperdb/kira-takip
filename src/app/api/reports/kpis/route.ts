import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const year  = new Date().getFullYear();
    const from  = new Date(`${year}-01-01`);
    const to    = new Date(`${year}-12-31T23:59:59`);

    // YTD: actual payments (not receivables)
    const [paymentAgg, expenseAgg, unitStats, overdueCount] = await Promise.all([
      prisma.payment.aggregate({
        where: { paidAt: { gte: from, lte: to } },
        _sum:  { amount: true },
      }),
      prisma.expense.aggregate({
        where: { date: { gte: from, lte: to } },
        _sum:  { amount: true },
      }),
      prisma.unit.groupBy({
        by:      ['status'],
        _count:  { _all: true },
      }),
      prisma.rentCharge.count({ where: { status: 'overdue' } }),
    ]);

    const totalIncome   = Math.round(Number(paymentAgg._sum.amount  ?? 0) * 100) / 100;
    const totalExpenses = Math.round(Number(expenseAgg._sum.amount  ?? 0) * 100) / 100;
    const netIncome     = Math.round((totalIncome - totalExpenses)  * 100) / 100;

    const totalUnits    = unitStats.reduce((s, g) => s + g._count._all, 0);
    const occupiedUnits = unitStats.find(g => g.status === 'occupied')?._count._all ?? 0;
    const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 1000) / 10 : 0;

    return NextResponse.json({
      year,
      totalIncome,
      totalExpenses,
      netIncome,
      totalUnits,
      occupiedUnits,
      occupancyRate,
      overdueCount,
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
