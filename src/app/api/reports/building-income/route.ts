import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get('from');
    const to   = searchParams.get('to');

    const dateFrom = from ? new Date(from) : new Date('2000-01-01');
    const dateTo   = to   ? new Date(to + 'T23:59:59') : new Date('2099-12-31');

    const rows = await prisma.$queryRaw<Array<{
      id:             number | bigint;
      title:          string;
      total_charged:  number;
      total_paid:     number;
      overdue_amount: number;
      overdue_count:  number | bigint;
    }>>(Prisma.sql`
      SELECT
        p.id,
        p.title,
        COALESCE(SUM(rc.charge_amount), 0)   AS total_charged,
        COALESCE(SUM(rc.paid_amount), 0)     AS total_paid,
        COALESCE(SUM(CASE WHEN rc.status = 'overdue' THEN rc.charge_amount - rc.paid_amount ELSE 0 END), 0) AS overdue_amount,
        COUNT(CASE WHEN rc.status = 'overdue' THEN 1 END) AS overdue_count
      FROM properties p
      LEFT JOIN units u   ON u.property_id  = p.id
      LEFT JOIN rent_charges rc ON rc.unit_id = u.id
        AND rc.period_start >= ${dateFrom}
        AND rc.period_start <= ${dateTo}
      GROUP BY p.id, p.title
      ORDER BY total_paid DESC
    `);

    const result = rows.map(r => {
      const charged  = Number(r.total_charged);
      const paid     = Number(r.total_paid);
      const overdue  = Number(r.overdue_amount);
      return {
        id:             Number(r.id),
        title:          r.title,
        totalCharged:   charged,
        totalPaid:      paid,
        overdueAmount:  overdue,
        overdueCount:   Number(r.overdue_count),
        collectionRate: charged > 0 ? Math.round((paid / charged) * 100) : 0,
      };
    });

    return NextResponse.json(result);
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
