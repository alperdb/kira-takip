import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getUserDb } from '@/lib/user-db';
import { calcRentIncrease, getEffectiveRentAmount } from '@/lib/charges';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
    const db = getUserDb(session.id);
    const { id } = await params;
    const contractId = Number(id);
    if (isNaN(contractId)) {
      return NextResponse.json({ error: 'Geçersiz sözleşme id' }, { status: 400 });
    }
    const increases = await db.contractIncrease.findMany({
      where:   { contractId },
      orderBy: { effectiveDate: 'asc' },
    });
    return NextResponse.json(increases);
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
    const { effectiveDate, increaseType, ratePercent, notes } = await req.json();

    // id doğrulama
    const contractId = Number(id);
    if (isNaN(contractId)) {
      return NextResponse.json({ error: 'Geçersiz sözleşme id' }, { status: 400 });
    }

    // Validasyon
    if (!effectiveDate || !increaseType) {
      return NextResponse.json(
        { error: 'effectiveDate ve increaseType zorunlu' },
        { status: 400 },
      );
    }

    const parsedDate = new Date(effectiveDate);
    if (isNaN(parsedDate.getTime())) {
      return NextResponse.json({ error: 'Geçersiz tarih formatı' }, { status: 400 });
    }

    const rate = Number(ratePercent ?? 0);
    if (isNaN(rate) || rate < 0) {
      return NextResponse.json(
        { error: 'ratePercent sıfır veya pozitif olmalı' },
        { status: 400 },
      );
    }

    if (!['monthly_tufe', 'avg12_tufe', 'manual'].includes(increaseType)) {
      return NextResponse.json(
        { error: 'increaseType: monthly_tufe | avg12_tufe | manual olmalı' },
        { status: 400 },
      );
    }

    // Sözleşme bul
    const contract = await db.contract.findUnique({ where: { id: contractId } });
    if (!contract) return NextResponse.json({ error: 'Sözleşme bulunamadı' }, { status: 404 });

    const oldRent = await getEffectiveRentAmount(db, contractId, parsedDate);

    const { newRent, increaseAmount } = calcRentIncrease(oldRent, rate);

    // Transaction: artış kaydı + contract.currentRent güncelle
    const [increase] = await db.$transaction([
      db.contractIncrease.create({
        data: {
          contractId,
          effectiveDate:  parsedDate,
          oldAmount:      oldRent,
          increaseAmount,
          newAmount:      newRent,
          increaseType,
          ratePercent:    rate,
          notes:          notes ?? null,
        },
      }),
      db.contract.update({
        where: { id: contractId },
        data:  { currentRent: newRent },
      }),
    ]);

    return NextResponse.json(increase, { status: 201 });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
