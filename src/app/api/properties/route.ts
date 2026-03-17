import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const ownerId = searchParams.get('owner_id');

    const properties = await prisma.property.findMany({
      where: ownerId ? { ownerId: Number(ownerId) } : undefined,
      include: {
        owner: { select: { id: true, name: true } },
        _count: { select: { units: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(properties);
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { ownerId, title, address, city, district, type } = body;

    if (!ownerId || !title?.trim()) {
      return NextResponse.json({ error: 'ownerId ve title zorunlu' }, { status: 400 });
    }

    const property = await prisma.property.create({
      data: { ownerId: Number(ownerId), title: title.trim(), address, city, district, type },
    });
    return NextResponse.json(property, { status: 201 });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
