import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getUserDb } from '@/lib/user-db';
import { getEffectiveRentAmount } from '@/lib/charges';

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
    const db = getUserDb(session.id);
    const { id } = await params;
    const contractId = Number(id);

    if (!contractId || isNaN(contractId) || contractId <= 0) {
      return NextResponse.json({ error: 'Geçersiz ID' }, { status: 400 });
    }

    const { newStartDate, newEndDate, newRent, depositAmount, paymentDay } = await req.json();

    if (!newStartDate) {
      return NextResponse.json({ error: 'newStartDate zorunlu' }, { status: 400 });
    }

    const parsedStart = new Date(newStartDate);
    if (isNaN(parsedStart.getTime())) {
      return NextResponse.json({ error: 'Geçersiz başlangıç tarihi' }, { status: 400 });
    }

    const parsedEnd = newEndDate ? new Date(newEndDate) : null;
    if (parsedEnd && isNaN(parsedEnd.getTime())) {
      return NextResponse.json({ error: 'Geçersiz bitiş tarihi' }, { status: 400 });
    }

    if (parsedEnd && parsedEnd <= parsedStart) {
      return NextResponse.json({ error: 'Bitiş tarihi başlangıçtan sonra olmalı' }, { status: 400 });
    }

    if (paymentDay != null && (Number(paymentDay) < 1 || Number(paymentDay) > 28)) {
      return NextResponse.json({ error: 'paymentDay 1-28 arası olmalı' }, { status: 400 });
    }

    const old = await db.contract.findUnique({ where: { id: contractId } });
    if (!old) return NextResponse.json({ error: 'Sözleşme bulunamadı' }, { status: 404 });
    if (old.status !== 'active') {
      return NextResponse.json({ error: 'Sadece aktif sözleşme yenilenebilir' }, { status: 400 });
    }

    const rentAmount = newRent != null
      ? Number(newRent)
      : await getEffectiveRentAmount(db, contractId, new Date());

    if (isNaN(rentAmount) || rentAmount <= 0) {
      return NextResponse.json({ error: 'Kira bedeli sıfırdan büyük olmalı' }, { status: 400 });
    }

    // Çakışma kontrolü: aynı unit'te yeni dönemle örtüşen başka aktif sözleşme var mı?
    const overlap = await db.contract.findFirst({
      where: {
        id:     { not: contractId },
        unitId: old.unitId,
        status: 'active',
        AND: [
          { startDate: { lte: parsedEnd ?? new Date('2999-12-31') } },
          {
            OR: [
              { endDate: null },
              { endDate: { gte: parsedStart } },
            ],
          },
        ],
      },
      select: {
        id:     true,
        tenant: { select: { name: true } },
      },
    });

    if (overlap) {
      return NextResponse.json(
        {
          error: `Bu daire için ${overlap.tenant.name} adına çakışan aktif bir sözleşme mevcut (ID: ${overlap.id}). Önce o sözleşmeyi sonlandırın.`,
        },
        { status: 409 },
      );
    }

    const renewed = await db.$transaction(async (tx) => {
      // Eski sözleşmeyi kapat
      await tx.contract.update({
        where: { id: contractId },
        data: {
          status:            'terminated',
          terminationDate:   parsedStart,
          terminationReason: 'Yenileme',
        },
      });

      // Yeni sözleşme oluştur
      return tx.contract.create({
        data: {
          unitId:        old.unitId,
          tenantId:      old.tenantId,
          startDate:     parsedStart,
          endDate:       parsedEnd,
          rentAmount,
          currentRent:   rentAmount,
          currency:      old.currency,
          paymentDay:    paymentDay != null ? Number(paymentDay) : old.paymentDay,
          depositAmount: depositAmount != null ? Number(depositAmount) : old.depositAmount,
          depositStatus: old.depositStatus,
          status:        'active',
        },
        include: {
          tenant: { select: { name: true } },
          unit:   { select: { unitNo: true, property: { select: { title: true } } } },
        },
      });
    });

    return NextResponse.json(renewed, { status: 201 });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
