import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const contractId = Number(id);

    const charges = await prisma.rentCharge.findMany({
      where: { contractId },
      select: {
        id: true,
        chargeAmount: true,
        periodStart: true,
        payments: {
          orderBy: { paidAt: 'asc' },
          select: { id: true, amount: true, paidAt: true, method: true, referenceNo: true, notes: true },
        },
      },
      orderBy: { periodStart: 'asc' },
    });

    const rows: {
      id:           number;
      paidAt:       string;
      amount:       number;
      method:       string;
      referenceNo:  string | null;
      notes:        string | null;
      chargePeriod: string;
      balanceAfter: number;
    }[] = [];

    for (const charge of charges) {
      let running = 0;
      for (const p of charge.payments) {
        running += Number(p.amount);
        rows.push({
          id:           p.id,
          paidAt:       new Date(p.paidAt).toISOString(),
          amount:       Number(p.amount),
          method:       p.method,
          referenceNo:  p.referenceNo ?? null,
          notes:        p.notes ?? null,
          chargePeriod: new Date(charge.periodStart).toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' }),
          balanceAfter: Math.max(0, Number(charge.chargeAmount) - running),
        });
      }
    }

    // Newest first
    rows.sort((a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime());

    return NextResponse.json(rows);
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
