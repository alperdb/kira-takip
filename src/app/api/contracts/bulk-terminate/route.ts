import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { ids } = await req.json();
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'Geçersiz istek' }, { status: 400 });
    }

    const now = new Date();

    // Only terminate active contracts
    const contracts = await prisma.contract.findMany({
      where: { id: { in: ids }, status: 'active' },
      select: { id: true, unitId: true },
    });

    if (contracts.length === 0) {
      return NextResponse.json({ error: 'Seçili sözleşmelerde aktif olan bulunamadı' }, { status: 400 });
    }

    const unitIds = [...new Set(contracts.map(c => c.unitId))];
    const contractIds = contracts.map(c => c.id);

    await prisma.$transaction([
      prisma.contract.updateMany({
        where: { id: { in: contractIds } },
        data: { status: 'terminated', terminationDate: now },
      }),
      prisma.unit.updateMany({
        where: { id: { in: unitIds } },
        data: { status: 'vacant' },
      }),
    ]);

    return NextResponse.json({ ok: true, count: contractIds.length });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
