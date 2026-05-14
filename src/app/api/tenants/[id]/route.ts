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
    const tenant = await db.tenant.findUnique({
      where: { id: Number(id) },
      include: {
        contracts: {
          orderBy: { startDate: 'desc' },
          include: {
            unit: { select: { id: true, unitNo: true, property: { select: { id: true, title: true } } } },
          },
        },
      },
    });
    if (!tenant) return NextResponse.json({ error: 'Bulunamadı' }, { status: 404 });
    return NextResponse.json(tenant);
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
    const db = getUserDb(session.id);

    const { id } = await params;
    const { name, phone, email, nationalId, address, notes } = await req.json();
    const tenant = await db.tenant.update({
      where: { id: Number(id) },
      data: { name, phone, email, nationalId, address, notes },
    });
    return NextResponse.json(tenant);
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
    const db = getUserDb(session.id);

    const { id } = await params;
    const tenantId = Number(id);
    const tenant = await db.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) return NextResponse.json({ error: 'Bulunamadı' }, { status: 404 });

    // Cascade hard delete: payments → charges → contracts → tenant
    const contracts = await db.contract.findMany({ where: { tenantId }, select: { id: true } });
    const contractIds = contracts.map(c => c.id);
    if (contractIds.length > 0) {
      const charges = await db.rentCharge.findMany({ where: { contractId: { in: contractIds } }, select: { id: true } });
      const chargeIds = charges.map(c => c.id);
      if (chargeIds.length > 0) {
        await db.payment.deleteMany({ where: { rentChargeId: { in: chargeIds } } });
        await db.rentCharge.deleteMany({ where: { id: { in: chargeIds } } });
      }
      await db.contractIncrease.deleteMany({ where: { contractId: { in: contractIds } } });
      await db.depositTransaction.deleteMany({ where: { contractId: { in: contractIds } } });
      await db.contract.deleteMany({ where: { id: { in: contractIds } } });
    }
    await db.tenant.delete({ where: { id: tenantId } });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
