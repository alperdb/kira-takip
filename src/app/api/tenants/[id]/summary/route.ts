import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { getSession } from '@/lib/auth';
import { getUserDb } from '@/lib/user-db';
import { getEffectiveRentAmount } from '@/lib/charges';

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
    const db = getUserDb(session.id);

    const { id } = await params;
    const tenantId = Number(id);

    if (!tenantId || isNaN(tenantId) || tenantId <= 0) {
      return NextResponse.json({ error: 'Geçersiz ID' }, { status: 400 });
    }

    const tenant = await db.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) return NextResponse.json({ error: 'Kiracı bulunamadı' }, { status: 404 });

    const includeArchived = req.nextUrl.searchParams.get('includeArchived') === 'true';

    const chargeFilter: Prisma.RentChargeWhereInput = {
      tenantId,
      ...(!includeArchived && {
        contract: { status: { not: 'terminated' } },
      }),
    };

    const charges = await db.rentCharge.findMany({
      where: chargeFilter,
      select: { chargeAmount: true, paidAmount: true, status: true },
    });

    if (charges.length === 0) {
      return NextResponse.json({
        totalReceivables: 0,
        totalPayments: 0,
        balance: 0,
        currency: 'TRY',
        overdueCount: 0,
        chargeCount: 0,
        activeContract: null,
      });
    }

    const totalReceivables = Math.round(charges.reduce((s, c) => s + c.chargeAmount, 0) * 100) / 100;
    const totalPayments    = Math.round(charges.reduce((s, c) => s + c.paidAmount,   0) * 100) / 100;
    const balance          = Math.round((totalReceivables - totalPayments) * 100) / 100;
    const overdueCount     = charges.filter(c => c.status === 'overdue').length;

    const activeContract = await db.contract.findFirst({
      where: { tenantId, status: 'active' },
      select: {
        id: true,
        rentAmount: true,
        currency: true,
        startDate: true,
        endDate: true,
        unit: { select: { unitNo: true, property: { select: { title: true } } } },
      },
    });

    const effectiveRent = activeContract
      ? await getEffectiveRentAmount(activeContract.id, new Date())
      : null;

    return NextResponse.json({
      totalReceivables,
      totalPayments,
      balance,
      currency: 'TRY',
      overdueCount,
      chargeCount: charges.length,
      activeContract: activeContract
        ? { ...activeContract, effectiveRent }
        : null,
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
