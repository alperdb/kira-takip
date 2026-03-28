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
    const property = await db.property.findUnique({ where: { id: Number(id) } });
    if (!property) return NextResponse.json({ error: 'Bulunamadı' }, { status: 404 });
    await db.property.update({ where: { id: Number(id) }, data: { isArchived: true } });
    return NextResponse.json({ ok: true, message: 'Bina arşivlendi' });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
