import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = (searchParams.get('search') ?? '').trim();
    const status = searchParams.get('status') ?? 'all'; // 'all' | 'overdue' | 'balance'

    const rows = await prisma.$queryRaw<Array<{
      id:            number | bigint;
      name:          string;
      total_charged: number;
      total_paid:    number;
      balance:       number;
      has_overdue:   number | bigint;
    }>>(Prisma.sql`
      SELECT
        t.id,
        t.name,
        COALESCE(SUM(rc.charge_amount), 0)              AS total_charged,
        COALESCE(SUM(rc.paid_amount), 0)                AS total_paid,
        COALESCE(SUM(rc.charge_amount - rc.paid_amount), 0) AS balance,
        MAX(CASE WHEN rc.status = 'overdue' THEN 1 ELSE 0 END) AS has_overdue
      FROM tenants t
      LEFT JOIN rent_charges rc ON rc.tenant_id = t.id
      GROUP BY t.id, t.name
      HAVING total_charged > 0
      ORDER BY balance DESC, t.name ASC
    `);

    let result = rows.map(r => ({
      id:           Number(r.id),
      name:         r.name,
      totalCharged: Number(r.total_charged),
      totalPaid:    Number(r.total_paid),
      balance:      Number(r.balance),
      hasOverdue:   Number(r.has_overdue) === 1,
    }));

    // Client-side filters (lightweight — tenant list is small)
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(r => r.name.toLowerCase().includes(q));
    }
    if (status === 'overdue') {
      result = result.filter(r => r.hasOverdue);
    } else if (status === 'balance') {
      result = result.filter(r => r.balance > 0.01);
    }

    return NextResponse.json(result);
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
