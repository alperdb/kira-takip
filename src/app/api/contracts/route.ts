import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getUserDb } from '@/lib/user-db';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
    const db = getUserDb(session.id);
    const { searchParams } = new URL(req.url);
    const status   = searchParams.get('status');
    const unitId   = searchParams.get('unit_id');
    const tenantId = searchParams.get('tenant_id');

    const contracts = await db.contract.findMany({
      where: {
        ...(status   ? { status:   status   as 'active' | 'terminated' | 'expired' | 'pending' } : {}),
        ...(unitId   ? { unitId:   Number(unitId) }   : {}),
        ...(tenantId ? { tenantId: Number(tenantId) } : {}),
      },
      include: {
        unit: {
          select: {
            id: true, unitNo: true,
            property: { select: { id: true, title: true } },
          },
        },
        tenant: { select: { id: true, name: true, phone: true } },
      },
      orderBy: { startDate: 'desc' },
    });
    return NextResponse.json(contracts);
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
    const db = getUserDb(session.id);
    const body = await req.json();
    const {
      unitId, tenantId, startDate, endDate,
      rentAmount, currency, paymentDay,
      depositAmount, depositDate,
    } = body;

    if (!unitId || !tenantId || !startDate || !rentAmount) {
      return NextResponse.json(
        { error: 'unitId, tenantId, startDate, rentAmount zorunlu' },
        { status: 400 }
      );
    }
    if (Number(rentAmount) <= 0) {
      return NextResponse.json({ error: 'Kira bedeli sıfırdan büyük olmalı' }, { status: 400 });
    }

    const parsedStart = new Date(startDate);
    if (isNaN(parsedStart.getTime())) {
      return NextResponse.json({ error: 'Geçersiz başlangıç tarihi' }, { status: 400 });
    }
    if (endDate) {
      const parsedEnd = new Date(endDate);
      if (isNaN(parsedEnd.getTime())) {
        return NextResponse.json({ error: 'Geçersiz bitiş tarihi' }, { status: 400 });
      }
      if (parsedEnd < parsedStart) {
        return NextResponse.json({ error: 'Bitiş tarihi başlangıçtan önce olamaz' }, { status: 400 });
      }
    }

    if (paymentDay != null && (Number(paymentDay) < 1 || Number(paymentDay) > 28)) {
      return NextResponse.json({ error: 'paymentDay 1-28 arası olmalı' }, { status: 400 });
    }

    // Aynı unit'te aktif sözleşme var mı?
    const existing = await db.contract.findFirst({
      where: { unitId: Number(unitId), status: 'active' },
    });
    if (existing) {
      return NextResponse.json(
        { error: 'Bu dairede zaten aktif sözleşme var (id: ' + existing.id + ')' },
        { status: 409 }
      );
    }

    const [contract] = await db.$transaction([
      db.contract.create({
        data: {
          unitId:        Number(unitId),
          tenantId:      Number(tenantId),
          startDate:     new Date(startDate),
          endDate:       endDate ? new Date(endDate) : null,
          rentAmount:    Number(rentAmount),
          currency:      currency ?? 'TRY',
          paymentDay:    paymentDay ? Number(paymentDay) : 1,
          depositAmount: depositAmount ? Number(depositAmount) : 0,
          depositDate:   depositDate ? new Date(depositDate) : null,
        },
      }),
      // Unit'i occupied yap
      db.unit.update({
        where: { id: Number(unitId) },
        data:  { status: 'occupied' },
      }),
    ]);

    return NextResponse.json(contract, { status: 201 });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
