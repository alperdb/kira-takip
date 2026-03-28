import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getUserDb } from '@/lib/user-db';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
    const db = getUserDb(session.id);
    const { ids } = await req.json();
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'Geçersiz istek' }, { status: 400 });
    }

    const now = new Date();

    // Only terminate active contracts
    const contracts = await db.contract.findMany({
      where: { id: { in: ids }, status: 'active' },
      select: { id: true, unitId: true },
    });

    if (contracts.length === 0) {
      return NextResponse.json({ error: 'Seçili sözleşmelerde aktif olan bulunamadı' }, { status: 400 });
    }

    const unitIds = [...new Set(contracts.map(c => c.unitId))];
    const contractIds = contracts.map(c => c.id);

    await db.$transaction([
      db.contract.updateMany({
        where: { id: { in: contractIds } },
        data: { status: 'terminated', terminationDate: now },
      }),
      db.unit.updateMany({
        where: { id: { in: unitIds } },
        data: { status: 'vacant' },
      }),
    ]);

    return NextResponse.json({ ok: true, count: contractIds.length });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
