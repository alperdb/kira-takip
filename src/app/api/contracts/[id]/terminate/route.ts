import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getUserDb } from '@/lib/user-db';

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
    const db = getUserDb(session.id);
    const { id } = await params;
    const { terminationDate, terminationReason } = await req.json();

    const contract = await db.contract.findUnique({
      where: { id: Number(id) },
    });
    if (!contract) return NextResponse.json({ error: 'Bulunamadı' }, { status: 404 });
    if (contract.status !== 'active') {
      return NextResponse.json({ error: 'Sadece aktif sözleşme sonlandırılabilir' }, { status: 400 });
    }

    const [updated] = await db.$transaction([
      db.contract.update({
        where: { id: Number(id) },
        data: {
          status:            'terminated',
          terminationDate:   terminationDate ? new Date(terminationDate) : new Date(),
          terminationReason: terminationReason ?? null,
        },
      }),
      // Unit'i boşalt
      db.unit.update({
        where: { id: contract.unitId },
        data:  { status: 'vacant' },
      }),
    ]);

    return NextResponse.json(updated);
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
