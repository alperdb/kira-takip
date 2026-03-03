import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const tenant = await prisma.tenant.findUnique({
      where: { id: Number(id) },
      include: {
        contracts: {
          orderBy: { createdAt: 'desc' },
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
    const { id } = await params;
    const { name, phone, email, nationalId, address, notes } = await req.json();
    const tenant = await prisma.tenant.update({
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
    const { id } = await params;
    await prisma.tenant.delete({ where: { id: Number(id) } });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
