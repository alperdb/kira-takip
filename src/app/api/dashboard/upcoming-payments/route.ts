import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getEffectiveRentAmount } from '@/lib/charges';

export async function GET() {
  try {
    const today    = new Date();
    const todayDay = today.getDate();
    const year     = today.getFullYear();
    const month    = today.getMonth();

    const contracts = await prisma.contract.findMany({
      where: { status: 'active' },
      select: {
        id:         true,
        paymentDay: true,
        tenant: { select: { name: true } },
        unit:   { select: { unitNo: true, property: { select: { title: true } } } },
      },
    });

    const results = await Promise.all(
      contracts.map(async c => {
        // Next payment date: this month if paymentDay >= today, else next month
        let nextDate: Date;
        if (c.paymentDay >= todayDay) {
          nextDate = new Date(year, month, c.paymentDay);
        } else {
          nextDate = new Date(year, month + 1, c.paymentDay);
        }

        const daysUntil = Math.round(
          (nextDate.getTime() - today.setHours(0, 0, 0, 0)) / 86_400_000,
        );

        const chargeAmount = await getEffectiveRentAmount(c.id, nextDate);

        return {
          contractId:    c.id,
          tenantName:    c.tenant.name,
          propertyTitle: c.unit.property.title,
          unitNo:        c.unit.unitNo,
          paymentDay:    c.paymentDay,
          nextDate:      nextDate.toISOString().split('T')[0],
          daysUntil,
          chargeAmount,
        };
      }),
    );

    // Return only those due in next 14 days, sorted by soonest first
    const upcoming = results
      .filter(r => r.daysUntil >= 0 && r.daysUntil <= 14)
      .sort((a, b) => a.daysUntil - b.daysUntil);

    return NextResponse.json(upcoming);
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
