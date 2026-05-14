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
    const property = await db.property.findUnique({
      where: { id: Number(id) },
      include: {
        owner: { select: { id: true, name: true, phone: true } },
        units: { orderBy: { unitNo: 'asc' } },
      },
    });
    if (!property) return NextResponse.json({ error: 'Bulunamadı' }, { status: 404 });
    return NextResponse.json(property);
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
    const { ownerId, title, address, city, district, type } = await req.json();
    const property = await db.property.update({
      where: { id: Number(id) },
      data: { ownerId: ownerId ? Number(ownerId) : undefined, title, address, city, district, type },
    });
    return NextResponse.json(property);
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
    const propId = Number(id);

    const property = await db.property.findUnique({ where: { id: propId } });
    if (!property) return NextResponse.json({ error: 'Bulunamadı' }, { status: 404 });

    // Cascade hard delete: payments → charges → contracts → units → property
    const units = await db.unit.findMany({ where: { propertyId: propId }, select: { id: true } });
    const unitIds = units.map(u => u.id);

    if (unitIds.length > 0) {
      const contracts = await db.contract.findMany({
        where: { unitId: { in: unitIds } },
        select: { id: true },
      });
      const contractIds = contracts.map(c => c.id);

      if (contractIds.length > 0) {
        const charges = await db.rentCharge.findMany({
          where: { contractId: { in: contractIds } },
          select: { id: true },
        });
        const chargeIds = charges.map(c => c.id);

        if (chargeIds.length > 0) {
          await db.payment.deleteMany({ where: { rentChargeId: { in: chargeIds } } });
          await db.rentCharge.deleteMany({ where: { id: { in: chargeIds } } });
        }

        await db.contractIncrease.deleteMany({ where: { contractId: { in: contractIds } } });
        await db.contract.deleteMany({ where: { id: { in: contractIds } } });
      }

      await db.expense.updateMany({ where: { propertyId: propId }, data: { propertyId: null } });
      await db.unit.deleteMany({ where: { propertyId: propId } });
    }

    await db.property.delete({ where: { id: propId } });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
