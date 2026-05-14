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
    const owner = await db.owner.findUnique({
      where: { id: Number(id) },
      include: { properties: { include: { _count: { select: { units: true } } } } },
    });
    if (!owner) return NextResponse.json({ error: 'Bulunamadı' }, { status: 404 });
    return NextResponse.json(owner);
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
    const body = await req.json();
    const { name, phone, email, nationalId, address, notes } = body;

    const owner = await db.owner.update({
      where: { id: Number(id) },
      data: { name, phone, email, nationalId, address, notes },
    });
    return NextResponse.json(owner);
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
    const ownerId = Number(id);
    const owner = await db.owner.findUnique({ where: { id: ownerId } });
    if (!owner) return NextResponse.json({ error: 'Bulunamadı' }, { status: 404 });

    // Cascade hard delete: payments → charges → contracts → units → properties → owner
    const properties = await db.property.findMany({ where: { ownerId }, select: { id: true } });
    const propIds = properties.map(p => p.id);
    if (propIds.length > 0) {
      const units = await db.unit.findMany({ where: { propertyId: { in: propIds } }, select: { id: true } });
      const unitIds = units.map(u => u.id);
      if (unitIds.length > 0) {
        const contracts = await db.contract.findMany({ where: { unitId: { in: unitIds } }, select: { id: true } });
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
        await db.unit.deleteMany({ where: { id: { in: unitIds } } });
      }
      await db.expense.updateMany({ where: { propertyId: { in: propIds } }, data: { propertyId: null } });
      await db.property.deleteMany({ where: { id: { in: propIds } } });
    }
    await db.owner.delete({ where: { id: ownerId } });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
