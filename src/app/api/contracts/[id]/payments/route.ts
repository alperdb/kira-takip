import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getUserDb } from '@/lib/user-db';
import { applyPayment } from '@/lib/charges';

type Params = { params: Promise<{ id: string }> };

/** GET /api/contracts/[id]/payments — open balance summary */
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
    const db = getUserDb(session.id);
    const { id } = await params;
    const contractId = Number(id);

    const openCharges = await db.rentCharge.findMany({
      where: { contractId, status: { in: ['pending', 'partial', 'overdue'] } },
      select: { chargeAmount: true, paidAmount: true, status: true, dueDate: true },
      orderBy: { dueDate: 'asc' },
    });

    const totalOutstanding = openCharges.reduce(
      (s, c) => s + Math.max(0, Number(c.chargeAmount) - Number(c.paidAmount)), 0,
    );

    return NextResponse.json({ totalOutstanding, openCount: openCharges.length });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

/** POST /api/contracts/[id]/payments — apply FIFO payment across contract */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
    const db = getUserDb(session.id);
    const { id } = await params;
    const contractId = Number(id);
    const { amount, method, referenceNo, notes, paidAt } = await req.json();

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Geçerli bir tutar girin' }, { status: 400 });
    }

    const contract = await db.contract.findUnique({ where: { id: contractId } });
    if (!contract) return NextResponse.json({ error: 'Sözleşme bulunamadı' }, { status: 404 });

    const result = await applyPayment(
      contractId,
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
