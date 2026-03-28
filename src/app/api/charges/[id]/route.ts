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
    const charge = await db.rentCharge.findUnique({
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
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
    const db = getUserDb(session.id);
    const { id } = await params;
    const chargeId = Number(id);
    if (isNaN(chargeId)) {
      return NextResponse.json({ error: 'Geçersiz id' }, { status: 400 });
    }
    const charge = await db.rentCharge.findUnique({
      where: { id: chargeId },
      include: { _count: { select: { payments: true } } },
    });
    if (!charge) return NextResponse.json({ error: 'Bulunamadı' }, { status: 404 });

    // Block deletion if payments exist — financial history must be preserved
    if (charge._count.payments > 0) {
      return NextResponse.json(
        { error: `Bu alacakta ${charge._count.payments} ödeme kaydı var. Mali geçmişi korumak için ödeme kaydı olan alacaklar silinemez.` },
        { status: 409 },
      );
    }

    await db.rentCharge.delete({ where: { id: chargeId } });

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

// Tahakkuku sil değil, waived yap
export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
    const db = getUserDb(session.id);
    const { id }  = await params;
    const body = await req.json().catch(() => ({}));
    const { notes } = body;

    const existing = await db.rentCharge.findUnique({ where: { id: Number(id) } });
    if (!existing) return NextResponse.json({ error: 'Bulunamadı' }, { status: 404 });
    if (existing.status === 'paid') {
      return NextResponse.json({ error: 'Ödenmiş alacaklar iptal edilemez' }, { status: 409 });
    }
    if (Number(existing.paidAmount) > 0) {
      return NextResponse.json(
        { error: 'Kısmi ödeme yapılmış alacaklar iptal edilemez. Önce ödemeleri geri alın.' },
        { status: 409 },
      );
    }

    const charge = await db.rentCharge.update({
      where: { id: Number(id) },
      data:  { status: 'waived', notes },
    });
    return NextResponse.json(charge);
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
