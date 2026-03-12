import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const payments = await prisma.payment.findMany({
      select: {
        id:     true,
        amount: true,
        paidAt: true,
        method: true,
        rentCharge: {
          select: {
            tenant: { select: { name: true } },
            unit:   { select: { unitNo: true, property: { select: { title: true } } } },
          },
        },
      },
      orderBy: { paidAt: 'desc' },
      take: 8,
    });

    return NextResponse.json(payments.map(p => ({
      id:         p.id,
      amount:     Number(p.amount),
      paidAt:     p.paidAt,
      method:     p.method,
      tenant:     p.rentCharge.tenant.name,
      unit:       `${p.rentCharge.unit.property.title} · ${p.rentCharge.unit.unitNo}`,
    })));
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
