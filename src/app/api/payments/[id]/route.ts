import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getUserDb } from '@/lib/user-db';
import { computeChargeStatus } from '@/lib/chargeStatus';

type Params = { params: Promise<{ id: string }> };

// Ödeme iptal — sadece 24 saat içinde
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
    const db = getUserDb(session.id);

    const { id } = await params;
    const payment = await db.payment.findUnique({ where: { id: Number(id) } });
    if (!payment) return NextResponse.json({ error: 'Bulunamadı' }, { status: 404 });

    const hoursSince = (Date.now() - payment.createdAt.getTime()) / 1000 / 3600;
    if (hoursSince > 24) {
      return NextResponse.json(
        { error: '24 saatten eski ödemeler silinemez. Düzeltme için yeni kayıt girin.' },
        { status: 403 }
      );
    }

    const amount = Number(payment.amount);

    await db.$transaction([
      db.payment.delete({ where: { id: Number(id) } }),
      // paidAmount ve status'u geri al
      db.rentCharge.update({
        where: { id: payment.rentChargeId },
        data: {
          paidAmount: { decrement: amount },
          // Status'u recalculate etmek için raw değer kullanıyoruz
        },
      }),
    ]);

    // Status'u shared utility ile yeniden hesapla (waived ise dokunma)
    const updated = await db.rentCharge.findUnique({ where: { id: payment.rentChargeId } });
    if (updated && updated.status !== 'waived') {
      const paid   = Math.max(0, Number(updated.paidAmount));
      const status = computeChargeStatus(paid, Number(updated.chargeAmount), updated.dueDate);
      await db.rentCharge.update({
        where: { id: updated.id },
        data:  { status },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
