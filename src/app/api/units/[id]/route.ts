import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const unit = await prisma.unit.findUnique({
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
    const { id } = await params;
    const { unitNo, floor, type, grossSqm, netSqm, status } = await req.json();
    const unit = await prisma.unit.update({
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
    const { id } = await params;
    const unit = await prisma.unit.findUnique({
      where:   { id: Number(id) },
      include: { contracts: { where: { status: 'active' }, take: 1 } },
    });
    if (!unit) return NextResponse.json({ error: 'Bulunamadı' }, { status: 404 });
    if (unit.contracts.length > 0) {
      return NextResponse.json(
        { error: 'Aktif sözleşmesi olan daire arşivlenemez. Önce sözleşmeyi sonlandırın.' },
        { status: 409 },
      );
    }
    await prisma.unit.update({ where: { id: Number(id) }, data: { isArchived: true } });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
