import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const charge = await prisma.rentCharge.findUnique({
      where: { id: Number(id) },
      include: {
        payments: { orderBy: { paidAt: 'asc' } },
        tenant:   { select: { id: true, name: true, phone: true } },
        unit:     { select: { id: true, unitNo: true, property: { select: { title: true } } } },
      },
    });
    if (!charge) return NextResponse.json({ error: 'Bulunamadı' }, { status: 404 });
    return NextResponse.json(charge);
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const chargeId = Number(id);
    if (isNaN(chargeId)) {
      return NextResponse.json({ error: 'Geçersiz id' }, { status: 400 });
    }
    const charge = await prisma.rentCharge.findUnique({ where: { id: chargeId } });
    if (!charge) return NextResponse.json({ error: 'Bulunamadı' }, { status: 404 });

    // Ödemeleri ve alacağı aynı transaction'da sil
    await prisma.$transaction([
      prisma.payment.deleteMany({ where: { rentChargeId: chargeId } }),
      prisma.rentCharge.delete({ where: { id: chargeId } }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

// Tahakkuku sil değil, waived yap
export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const { id }  = await params;
    const { notes } = await req.json();
    const charge  = await prisma.rentCharge.update({
      where: { id: Number(id) },
      data:  { status: 'waived', notes },
    });
    return NextResponse.json(charge);
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
