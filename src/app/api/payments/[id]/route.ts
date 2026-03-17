import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { computeChargeStatus } from '@/lib/chargeStatus';

type Params = { params: Promise<{ id: string }> };

// Ödeme iptal — sadece 24 saat içinde
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const payment = await prisma.payment.findUnique({ where: { id: Number(id) } });
    if (!payment) return NextResponse.json({ error: 'Bulunamadı' }, { status: 404 });

    const hoursSince = (Date.now() - payment.createdAt.getTime()) / 1000 / 3600;
    if (hoursSince > 24) {
      return NextResponse.json(
        { error: '24 saatten eski ödemeler silinemez. Düzeltme için yeni kayıt girin.' },
        { status: 403 }
      );
    }

    const amount = Number(payment.amount);

    await prisma.$transaction([
      prisma.payment.delete({ where: { id: Number(id) } }),
      // paidAmount ve status'u geri al
      prisma.rentCharge.update({
        where: { id: payment.rentChargeId },
        data: {
          paidAmount: { decrement: amount },
          // Status'u recalculate etmek için raw değer kullanıyoruz
        },
      }),
    ]);

    // Status'u shared utility ile yeniden hesapla (waived ise dokunma)
    const updated = await prisma.rentCharge.findUnique({ where: { id: payment.rentChargeId } });
    if (updated && updated.status !== 'waived') {
      const paid   = Math.max(0, Number(updated.paidAmount));
      const status = computeChargeStatus(paid, Number(updated.chargeAmount), updated.dueDate);
      await prisma.rentCharge.update({
        where: { id: updated.id },
        data:  { status },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
