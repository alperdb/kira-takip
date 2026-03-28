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
    const year       = searchParams.get('year');

    const expenses = await db.expense.findMany({
      where: {
        ...(propertyId ? { propertyId: Number(propertyId) } : {}),
        ...(year ? {
          date: {
            gte: new Date(`${year}-01-01`),
            lte: new Date(`${year}-12-31`),
          },
        } : {}),
      },
      include: {
        property: { select: { id: true, title: true } },
      },
      orderBy: { date: 'desc' },
    });
    return NextResponse.json(expenses);
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
    const db = getUserDb(session.id);
    const { propertyId, unitId, category, amount, date, description } = await req.json();

    if (!amount || Number(amount) <= 0 || !date) {
      return NextResponse.json({ error: 'Geçerli bir tutar ve tarih zorunlu' }, { status: 400 });
    }

    const expense = await db.expense.create({
      data: {
        propertyId:  propertyId ? Number(propertyId) : null,
        unitId:      unitId     ? Number(unitId)     : null,
        category:    category   ?? null,
        amount:      Number(amount),
        date:        new Date(date),
        description: description ?? null,
      },
    });
    return NextResponse.json(expense, { status: 201 });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
