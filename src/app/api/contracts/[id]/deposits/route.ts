import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getUserDb } from '@/lib/user-db';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
    const db = getUserDb(session.id);
    const { id } = await params;
    const transactions = await db.depositTransaction.findMany({
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
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
    const db = getUserDb(session.id);
    const { id } = await params;
    const { type, amount, date, notes } = await req.json();

    if (!type || !amount || !date) {
      return NextResponse.json({ error: 'type, amount, date zorunlu' }, { status: 400 });
    }

    // Depozito durumunu güncelle
    const depositStatusMap: Record<string, 'held' | 'returned' | 'partial_returned' | 'applied_to_debt' | 'forfeited'> = {
      collected:       'held',
      refunded:        'returned',
      partial_refund:  'partial_returned',
      applied_to_debt: 'applied_to_debt',
      forfeited:       'forfeited',
    };

    if (!Object.keys(depositStatusMap).includes(type)) {
      return NextResponse.json({ error: 'Geçersiz depozito tipi' }, { status: 400 });
    }

    const contract = await db.contract.findUnique({ where: { id: Number(id) } });
    if (!contract) return NextResponse.json({ error: 'Sözleşme bulunamadı' }, { status: 404 });

    const [transaction] = await db.$transaction([
      db.depositTransaction.create({
        data: {
          contractId: Number(id),
          type,
          amount:     Number(amount),
          date:       new Date(date),
          notes,
        },
      }),
      db.contract.update({
        where: { id: Number(id) },
        data:  { depositStatus: depositStatusMap[type] ?? 'held' },
      }),
    ]);

    return NextResponse.json(transaction, { status: 201 });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
