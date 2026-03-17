import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const owner = await prisma.owner.findUnique({
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
    const { id } = await params;
    const body = await req.json();
    const { name, phone, email, nationalId, address, notes } = body;

    const owner = await prisma.owner.update({
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
    const { id } = await params;
    const owner = await prisma.owner.findUnique({
      where: { id: Number(id) },
      include: { _count: { select: { properties: true } } },
    });
    if (!owner) return NextResponse.json({ error: 'Bulunamadı' }, { status: 404 });
    if (owner._count.properties > 0) {
      return NextResponse.json(
        { error: `Bu sahibe ait ${owner._count.properties} bina var. Silmek için önce binaları kaldırın.` },
        { status: 409 },
      );
    }
    await prisma.owner.delete({ where: { id: Number(id) } });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
