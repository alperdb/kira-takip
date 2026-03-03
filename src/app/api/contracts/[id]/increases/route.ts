import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const increases = await prisma.contractIncrease.findMany({
      where:   { contractId: Number(id) },
      orderBy: { effectiveDate: 'asc' },
    });
    return NextResponse.json(increases);
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const { effectiveDate, newAmount, reason, notes } = await req.json();

    if (!effectiveDate || !newAmount || !reason) {
      return NextResponse.json(
        { error: 'effectiveDate, newAmount, reason zorunlu' },
        { status: 400 }
      );
    }

    // Geçerli kira miktarını bul
    const contract = await prisma.contract.findUnique({ where: { id: Number(id) } });
    if (!contract) return NextResponse.json({ error: 'Sözleşme bulunamadı' }, { status: 404 });

    const lastIncrease = await prisma.contractIncrease.findFirst({
      where:   { contractId: Number(id), effectiveDate: { lte: new Date(effectiveDate) } },
      orderBy: { effectiveDate: 'desc' },
    });
    const oldAmount = lastIncrease ? Number(lastIncrease.newAmount) : Number(contract.rentAmount);

    const increase = await prisma.contractIncrease.create({
      data: {
        contractId:    Number(id),
        effectiveDate: new Date(effectiveDate),
        oldAmount,
        newAmount:     Number(newAmount),
        reason,
        notes,
      },
    });
    return NextResponse.json(increase, { status: 201 });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
