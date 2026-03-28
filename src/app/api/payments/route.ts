import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getUserDb } from '@/lib/user-db';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
    const db = getUserDb(session.id);

    const payments = await db.payment.findMany({
      include: {
        rentCharge: {
          select: {
            periodStart: true,
            periodEnd:   true,
            tenant:   { select: { name: true } },
            unit:     { select: { unitNo: true, property: { select: { title: true } } } },
            contract: { select: { id: true } },
          },
        },
      },
      orderBy: { paidAt: 'desc' },
    });
    return NextResponse.json(payments);
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
