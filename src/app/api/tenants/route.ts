import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getUserDb } from '@/lib/user-db';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
    const db = getUserDb(session.id);

    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q');

    const tenants = await db.tenant.findMany({
      where: q
        ? {
            OR: [
              { name:  { contains: q } },
              { phone: { contains: q } },
              { email: { contains: q } },
            ],
          }
        : undefined,
      include: {
        _count: { select: { contracts: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(tenants);
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
    const { name, phone, email, nationalId, address, notes } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: 'name zorunlu' }, { status: 400 });
    }

    const tenant = await db.tenant.create({
      data: { name: name.trim(), phone, email, nationalId, address, notes },
    });
    return NextResponse.json(tenant, { status: 201 });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
