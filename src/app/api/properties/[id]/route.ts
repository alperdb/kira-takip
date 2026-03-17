import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const property = await prisma.property.findUnique({
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
    const { id } = await params;
    const { ownerId, title, address, city, district, type } = await req.json();
    const property = await prisma.property.update({
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
    const { id } = await params;
    const property = await prisma.property.findUnique({
      where: { id: Number(id) },
      include: { _count: { select: { units: true } } },
    });
    if (!property) return NextResponse.json({ error: 'Bulunamadı' }, { status: 404 });
    if (property._count.units > 0) {
      return NextResponse.json(
        { error: `Bu binada ${property._count.units} daire var. Silmek için önce daireleri kaldırın.` },
        { status: 409 },
      );
    }
    await prisma.property.delete({ where: { id: Number(id) } });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
