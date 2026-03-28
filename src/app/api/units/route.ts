import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getUserDb } from '@/lib/user-db';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
    const db = getUserDb(session.id);

    const { searchParams } = new URL(req.url);
    const propertyId = searchParams.get('property_id');
    const status     = searchParams.get('status');

    const units = await db.unit.findMany({
      where: {
        isArchived: false,
        ...(propertyId ? { propertyId: Number(propertyId) } : {}),
        ...(status     ? { status: status as 'vacant' | 'occupied' | 'maintenance' } : {}),
      },
      include: {
        property: { select: { id: true, title: true } },
        contracts: {
          where: { status: 'active' },
          select: {
            id: true, rentAmount: true, currency: true,
            tenant: { select: { id: true, name: true, phone: true } },
          },
          take: 1,
        },
      },
      orderBy: [{ propertyId: 'asc' }, { unitNo: 'asc' }],
    });
    return NextResponse.json(units);
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
    const db = getUserDb(session.id);

    const body = await req.json();
    const { propertyId, unitNo, floor, type, grossSqm, netSqm } = body;

    if (!propertyId || !unitNo?.trim()) {
      return NextResponse.json({ error: 'propertyId ve unitNo zorunlu' }, { status: 400 });
    }

    const unit = await db.unit.create({
      data: {
        propertyId: Number(propertyId),
        unitNo: unitNo.trim(),
        floor: floor ? Number(floor) : null,
        type,
        grossSqm: grossSqm ? Number(grossSqm) : null,
        netSqm:   netSqm   ? Number(netSqm)   : null,
      },
    });
    return NextResponse.json(unit, { status: 201 });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
