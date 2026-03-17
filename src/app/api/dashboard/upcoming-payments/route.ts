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
        let nextDate: Date;
        if (c.paymentDay >= todayDay) {
          nextDate = new Date(year, month, c.paymentDay);
        } else {
          nextDate = new Date(year, month + 1, c.paymentDay);
        }

        const daysUntil = Math.round(
          (nextDate.getTime() - new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) / 86_400_000,
        );

        if (daysUntil < 0 || daysUntil > 14) return null;

        // Check if a charge exists for this period
        const periodStart = new Date(nextDate.getFullYear(), nextDate.getMonth(), 1);
        const periodEnd   = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 1);

        const existingCharge = await prisma.rentCharge.findFirst({
          where: { contractId: c.id, periodStart: { gte: periodStart, lt: periodEnd } },
          select: { id: true, status: true, chargeAmount: true, paidAmount: true },
        });

        // Already handled or past due — exclude from upcoming widget
        if (
          existingCharge?.status === 'paid'    ||
          existingCharge?.status === 'waived'  ||
          existingCharge?.status === 'overdue'
        ) {
          return null;
        }

        const chargeAmount = await getEffectiveRentAmount(c.id, nextDate);
        const chargeId     = existingCharge?.id ?? null;
        const remaining    = existingCharge
          ? Math.max(0, Number(existingCharge.chargeAmount) - Number(existingCharge.paidAmount))
          : chargeAmount;

        return {
          contractId:    c.id,
          tenantName:    c.tenant.name,
          propertyTitle: c.unit.property.title,
          unitNo:        c.unit.unitNo,
          paymentDay:    c.paymentDay,
          nextDate:      nextDate.toISOString().split('T')[0],
          daysUntil,
          chargeAmount,
          chargeId,
          remaining,
        };
      }),
    );

    const upcoming = (results.filter(Boolean) as NonNullable<typeof results[number]>[])
      .sort((a, b) => a.daysUntil - b.daysUntil);

    return NextResponse.json(upcoming);
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
