import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { applyPayment } from '@/lib/charges';

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const { amount, method, referenceNo, notes, paidAt } = await req.json();

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Geçerli bir tutar girin' }, { status: 400 });
    }

    const charge = await prisma.rentCharge.findUnique({ where: { id: Number(id) } });
    if (!charge) return NextResponse.json({ error: 'Alacak bulunamadı' }, { status: 404 });
    if (charge.status === 'waived' || charge.status === 'paid') {
      return NextResponse.json({ error: 'Bu alacak zaten kapatılmış' }, { status: 400 });
    }

    // FIFO: bu charge'ın contractId'si üzerinden uygula
    const result = await applyPayment(
      charge.contractId,
      Number(amount),
      method ?? 'cash',
      referenceNo,
      notes,
      paidAt ? new Date(paidAt) : undefined,
    );

    return NextResponse.json(result, { status: 201 });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
