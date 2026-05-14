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
    const unit = await db.unit.findUnique({
      where: { id: Number(id) },
      include: {
        property: { select: { id: true, title: true, owner: { select: { id: true, name: true } } } },
        contracts: {
          orderBy: { startDate: 'desc' },
          include: { tenant: { select: { id: true, name: true, phone: true } } },
        },
      },
    });
    if (!unit) return NextResponse.json({ error: 'Bulunamadı' }, { status: 404 });
    return NextResponse.json(unit);
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
    const { unitNo, floor, type, grossSqm, netSqm, status } = await req.json();
    const unit = await db.unit.update({
      where: { id: Number(id) },
      data: {
        unitNo, type, status,
        floor:    floor    != null ? Number(floor)    : undefined,
        grossSqm: grossSqm != null ? Number(grossSqm) : undefined,
        netSqm:   netSqm   != null ? Number(netSqm)   : undefined,
      },
    });
    return NextResponse.json(unit);
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
    const unitId = Number(id);
    const unit = await db.unit.findUnique({ where: { id: unitId } });
    if (!unit) return NextResponse.json({ error: 'Bulunamadı' }, { status: 404 });

    // Cascade hard delete: payments → charges → contracts → unit
    const contracts = await db.contract.findMany({ where: { unitId }, select: { id: true } });
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
    await db.unit.delete({ where: { id: unitId } });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
