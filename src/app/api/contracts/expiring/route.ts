import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getUserDb } from '@/lib/user-db';

const THRESHOLDS = [30, 60, 90] as const;

export async function GET(_req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
    const db = getUserDb(session.id);
    const now = new Date();

    const contracts = await db.contract.findMany({
      where: {
        status: 'active',
        endDate: { not: null },
      },
      select: {
        id: true,
        endDate: true,
        rentAmount: true,
        currentRent: true,
        currency: true,
        tenant: { select: { id: true, name: true, phone: true } },
        unit: {
          select: {
            unitNo: true,
            property: { select: { id: true, title: true } },
          },
        },
      },
    });

    const result: Record<30 | 60 | 90, typeof contracts> = { 30: [], 60: [], 90: [] };

    for (const contract of contracts) {
      const daysLeft = Math.ceil(
        (contract.endDate!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (daysLeft <= 0) continue;

      for (const threshold of THRESHOLDS) {
        if (daysLeft <= threshold) {
          result[threshold].push(contract);
          break;
        }
      }
    }

    return NextResponse.json({
      within30Days: result[30],
      within60Days: result[60],
      within90Days: result[90],
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
