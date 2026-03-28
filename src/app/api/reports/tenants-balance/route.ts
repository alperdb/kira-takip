import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { getSession } from '@/lib/auth';
import { getUserDb } from '@/lib/user-db';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
    const db = getUserDb(session.id);

    const { searchParams } = new URL(req.url);
    const search = (searchParams.get('search') ?? '').trim();
    const status = searchParams.get('status') ?? 'all'; // 'all' | 'overdue' | 'balance'

    const rows = await db.$queryRaw<Array<{
      id:               number | bigint;
      name:             string;
      total_charged:    number;
      total_paid:       number;
      balance:          number;
      has_overdue:      number | bigint;
      paid_count:       number | bigint;
      overdue_count:    number | bigint;
    }>>(Prisma.sql`
      SELECT
        t.id,
        t.name,
        COALESCE(SUM(rc.charge_amount), 0)              AS total_charged,
        COALESCE(SUM(rc.paid_amount), 0)                AS total_paid,
        COALESCE(SUM(CASE WHEN rc.charge_amount > rc.paid_amount THEN rc.charge_amount - rc.paid_amount ELSE 0 END), 0) AS balance,
        MAX(CASE WHEN rc.status = 'overdue' THEN 1 ELSE 0 END) AS has_overdue,
        SUM(CASE WHEN rc.status = 'paid'    THEN 1 ELSE 0 END) AS paid_count,
        SUM(CASE WHEN rc.status = 'overdue' THEN 1 ELSE 0 END) AS overdue_count
      FROM tenants t
      LEFT JOIN rent_charges rc ON rc.tenant_id = t.id
      GROUP BY t.id, t.name
      HAVING total_charged > 0
      ORDER BY balance DESC, t.name ASC
    `);

    let result = rows.map(r => {
      const paid    = Number(r.paid_count);
      const overdue = Number(r.overdue_count);
      const total   = paid + overdue;
      const reliability = total > 0 ? Math.round((paid / total) * 100) : 100;
      return {
        id:              Number(r.id),
        name:            r.name,
        totalCharged:    Number(r.total_charged),
        totalPaid:       Number(r.total_paid),
        balance:         Number(r.balance),
        hasOverdue:      Number(r.has_overdue) === 1,
        reliabilityRate: reliability,
      };
    });

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
