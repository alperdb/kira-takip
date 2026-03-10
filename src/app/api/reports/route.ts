import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const year = Number(searchParams.get('year') ?? new Date().getFullYear());

    const from = new Date(`${year}-01-01`);
    const to   = new Date(`${year}-12-31T23:59:59`);

    // Monthly rent charges
    const chargeGroups = await prisma.rentCharge.groupBy({
      by: ['periodStart'],
      where: { periodStart: { gte: from, lte: to } },
      _sum: { chargeAmount: true, paidAmount: true },
      orderBy: { periodStart: 'asc' },
    });

    // Monthly expenses
    const expenseGroups = await prisma.expense.groupBy({
      by: ['date'],
      where: { date: { gte: from, lte: to } },
      _sum: { amount: true },
    });

    // Build month key → expense map
    const expenseByMonth: Record<string, number> = {};
    for (const eg of expenseGroups) {
      const key = `${new Date(eg.date).getFullYear()}-${String(new Date(eg.date).getMonth() + 1).padStart(2, '0')}`;
      expenseByMonth[key] = (expenseByMonth[key] ?? 0) + Number(eg._sum.amount ?? 0);
    }

    const TR_MONTHS = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];

    const rows = chargeGroups.map(g => {
      const d        = new Date(g.periodStart);
      const key      = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const alacak   = Number(g._sum.chargeAmount ?? 0);
      const tahsilat = Number(g._sum.paidAmount   ?? 0);
      const gider    = expenseByMonth[key] ?? 0;
      const net      = tahsilat - gider;
      return {
        key,
        month:     TR_MONTHS[d.getMonth()],
        alacak,
        tahsilat,
        gider,
        net,
      };
    });

    const totals = rows.reduce(
      (acc, r) => ({
        alacak:   acc.alacak   + r.alacak,
        tahsilat: acc.tahsilat + r.tahsilat,
        gider:    acc.gider    + r.gider,
        net:      acc.net      + r.net,
      }),
      { alacak: 0, tahsilat: 0, gider: 0, net: 0 },
    );

    return NextResponse.json({ year, rows, totals });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
