import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const transactions = await prisma.depositTransaction.findMany({
      where:   { contractId: Number(id) },
      orderBy: { date: 'asc' },
    });
    return NextResponse.json(transactions);
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const { type, amount, date, notes } = await req.json();

    if (!type || !amount || !date) {
      return NextResponse.json({ error: 'type, amount, date zorunlu' }, { status: 400 });
    }

    const contract = await prisma.contract.findUnique({ where: { id: Number(id) } });
    if (!contract) return NextResponse.json({ error: 'Sözleşme bulunamadı' }, { status: 404 });

    // Depozito durumunu güncelle
    const depositStatusMap: Record<string, 'held' | 'returned' | 'partial_returned' | 'applied_to_debt' | 'forfeited'> = {
      collected:       'held',
      refunded:        'returned',
      partial_refund:  'partial_returned',
      applied_to_debt: 'applied_to_debt',
      forfeited:       'forfeited',
    };

    const [transaction] = await prisma.$transaction([
      prisma.depositTransaction.create({
        data: {
          contractId: Number(id),
          type,
          amount:     Number(amount),
          date:       new Date(date),
          notes,
        },
      }),
      prisma.contract.update({
        where: { id: Number(id) },
        data:  { depositStatus: depositStatusMap[type] ?? 'held' },
      }),
    ]);

    return NextResponse.json(transaction, { status: 201 });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
