import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const payments = await prisma.payment.findMany({
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
