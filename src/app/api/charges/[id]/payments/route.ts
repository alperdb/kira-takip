import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getUserDb } from '@/lib/user-db';
import { applyPayment } from '@/lib/charges';

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
    const db = getUserDb(session.id);
    const { id } = await params;
    const { amount, method, referenceNo, notes, paidAt } = await req.json();

    if (typeof amount !== 'number' || isNaN(amount) || amount <= 0) {
      return NextResponse.json({ error: 'Geçerli bir tutar girin' }, { status: 400 });
    }

    const validMethods = ['cash', 'bank', 'eft', 'check', 'other'];
    if (method !== undefined && !validMethods.includes(method)) {
      return NextResponse.json({ error: 'Geçersiz ödeme yöntemi' }, { status: 400 });
    }

    const charge = await db.rentCharge.findUnique({ where: { id: Number(id) } });
    if (!charge) return NextResponse.json({ error: 'Alacak bulunamadı' }, { status: 404 });
    if (charge.status === 'waived' || charge.status === 'paid') {
      return NextResponse.json({ error: 'Bu alacak zaten kapatılmış' }, { status: 400 });
    }

    // FIFO: bu charge'ın contractId'si üzerinden uygula
    const result = await applyPayment(
      db,
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
