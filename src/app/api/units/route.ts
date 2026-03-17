import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const propertyId = searchParams.get('property_id');
    const status     = searchParams.get('status');

    const units = await prisma.unit.findMany({
      where: {
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
    const body = await req.json();
    const { propertyId, unitNo, floor, type, grossSqm, netSqm } = body;

    if (!propertyId || !unitNo?.trim()) {
      return NextResponse.json({ error: 'propertyId ve unitNo zorunlu' }, { status: 400 });
    }

    const unit = await prisma.unit.create({
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
