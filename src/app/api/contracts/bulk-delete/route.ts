import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { ids } = await req.json();
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'Geçersiz istek' }, { status: 400 });
    }

    // Load all selected contracts with payment-existence check
    const contracts = await prisma.contract.findMany({
      where: { id: { in: ids } },
      select: {
        id:     true,
        status: true,
        unitId: true,
        _count: { select: { rentCharges: { where: { payments: { some: {} } } } } },
      },
    });

    const withPayments = contracts.filter(c => c._count.rentCharges > 0);
    const noPayments   = contracts.filter(c => c._count.rentCharges === 0);

    // Hard block: active contracts with no payments must be terminated first
    const blockedActive = noPayments.filter(c => c.status === 'active');
    if (blockedActive.length > 0) {
      return NextResponse.json(
        {
          error:  `${blockedActive.length} aktif sözleşme (ödeme kaydı yok). Silmeden önce sonlandırın.`,
          code:   'ACTIVE_NO_PAYMENTS',
          count:  blockedActive.length,
        },
        { status: 409 },
      );
    }

    // Smart split:
    // - withPayments + active  → terminate (preserve financial history)
    // - withPayments + non-active → already archived, skip
    // - noPayments + non-active → delete cascade
    const toTerminate = withPayments.filter(c => c.status === 'active');
    const toDelete    = noPayments;   // all are non-active (blocked active case handled above)
    const skipped     = withPayments.filter(c => c.status !== 'active');

    // Execute both operations; each is its own transaction-safe block
    if (toTerminate.length > 0) {
      const terminateIds = toTerminate.map(c => c.id);
      const unitIds      = [...new Set(toTerminate.map(c => c.unitId))];
      await prisma.$transaction([
        prisma.contract.updateMany({
          where: { id: { in: terminateIds } },
          data:  { status: 'terminated', terminationDate: new Date() },
        }),
        prisma.unit.updateMany({
          where: { id: { in: unitIds } },
          data:  { status: 'vacant' },
        }),
      ]);
    }

    if (toDelete.length > 0) {
      const deleteIds = toDelete.map(c => c.id);
      await prisma.$transaction([
        prisma.rentCharge.deleteMany({ where: { contractId: { in: deleteIds } } }),
        prisma.contractIncrease.deleteMany({ where: { contractId: { in: deleteIds } } }),
        prisma.depositTransaction.deleteMany({ where: { contractId: { in: deleteIds } } }),
        prisma.contract.deleteMany({ where: { id: { in: deleteIds } } }),
      ]);
    }

    return NextResponse.json({
      ok:       true,
      deleted:  toDelete.length,
      archived: toTerminate.length,
      kept:     skipped.length,
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
