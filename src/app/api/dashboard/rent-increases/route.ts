import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getEffectiveRentAmount } from '@/lib/charges';

const LOOKAHEAD_DAYS = 90;

export async function GET(_req: NextRequest) {
  try {
    const now      = new Date();
    const cutoff   = new Date(now);
    cutoff.setDate(cutoff.getDate() + LOOKAHEAD_DAYS);

    const contracts = await prisma.contract.findMany({
      where: { status: 'active' },
      select: {
        id:        true,
        startDate: true,
        tenant:    { select: { id: true, name: true } },
        unit:      { select: { unitNo: true, property: { select: { id: true, title: true } } } },
        increases: {
          orderBy: { effectiveDate: 'desc' },
          take:    1,
          select:  { effectiveDate: true },
        },
      },
    });

    const alerts = await Promise.all(
      contracts.map(async (c) => {
        const baseDate   = c.increases[0]?.effectiveDate ?? c.startDate;
        const nextDate   = new Date(baseDate);
        nextDate.setFullYear(nextDate.getFullYear() + 1);

        // Geçmişte kalmışsa bir sonraki yıla taşı
        while (nextDate <= now) nextDate.setFullYear(nextDate.getFullYear() + 1);

        if (nextDate > cutoff) return null;

        const daysRemaining = Math.ceil(
          (nextDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        );
        const currentRent = await getEffectiveRentAmount(c.id, now);

        return {
          contractId:      c.id,
          tenantId:        c.tenant.id,
          tenantName:      c.tenant.name,
          propertyId:      c.unit.property.id,
          propertyTitle:   c.unit.property.title,
          unitNo:          c.unit.unitNo,
          currentRent,
          nextIncreaseDate: nextDate,
          daysRemaining,
        };
      }),
    );

    const result = alerts
      .filter((a): a is NonNullable<typeof a> => a !== null)
      .sort((a, b) => a.daysRemaining - b.daysRemaining);

    return NextResponse.json({ alerts: result, total: result.length });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
