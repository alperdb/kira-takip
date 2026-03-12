import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { ids, force = false } = await req.json();
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'Geçersiz istek' }, { status: 400 });
    }

    // Block deletion of active contracts
    const active = await prisma.contract.findMany({
      where: { id: { in: ids }, status: 'active' },
      select: { id: true },
    });
    if (active.length > 0) {
      return NextResponse.json(
        { error: `${active.length} aktif sözleşme var. Önce sonlandırın.` },
        { status: 409 },
      );
    }

    // Hard block: never delete contracts that have collected payments
    const withPayments = await prisma.rentCharge.count({
      where: { contractId: { in: ids }, payments: { some: {} } },
    });
    if (withPayments > 0) {
      return NextResponse.json(
        {
          error: `Seçili sözleşmelerde ${withPayments} ödeme kaydı bulunuyor. Mali geçmişi korumak için ödeme kaydı olan sözleşmeler silinemez. Bu sözleşmeleri "Sonlandırıldı" olarak bırakın.`,
          code:  'HAS_PAYMENTS',
        },
        { status: 409 },
      );
    }

    // Warn if any have unpaid charges (allow with force — no payments, safe to delete)
    const withCharges = await prisma.contract.findMany({
      where: { id: { in: ids }, rentCharges: { some: {} } },
      select: { id: true },
    });
    if (withCharges.length > 0 && !force) {
      return NextResponse.json(
        {
          error: `${withCharges.length} sözleşmenin alacak kaydı var. Silmek için alacaklar da silinecek.`,
          code:  'HAS_CHARGES',
          count: withCharges.length,
        },
        { status: 409 },
      );
    }

    // Safe cascade: charges have no payments, delete charges → increases/deposits → contracts
    await prisma.$transaction([
      prisma.rentCharge.deleteMany({ where: { contractId: { in: ids } } }),
      prisma.contractIncrease.deleteMany({ where: { contractId: { in: ids } } }),
      prisma.depositTransaction.deleteMany({ where: { contractId: { in: ids } } }),
      prisma.contract.deleteMany({ where: { id: { in: ids } } }),
    ]);

    return NextResponse.json({ ok: true, count: ids.length });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
