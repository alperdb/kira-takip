import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const owners = await prisma.owner.findMany({
      include: { _count: { select: { properties: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(owners);
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, phone, email, nationalId, address, notes } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: 'name zorunlu' }, { status: 400 });
    }

    const owner = await prisma.owner.create({
      data: { name: name.trim(), phone, email, nationalId, address, notes },
    });
    return NextResponse.json(owner, { status: 201 });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
