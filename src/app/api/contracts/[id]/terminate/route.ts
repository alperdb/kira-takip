import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const { terminationDate, terminationReason } = await req.json();

    const contract = await prisma.contract.findUnique({
      where: { id: Number(id) },
    });
    if (!contract) return NextResponse.json({ error: 'Bulunamadı' }, { status: 404 });
    if (contract.status !== 'active') {
      return NextResponse.json({ error: 'Sadece aktif sözleşme sonlandırılabilir' }, { status: 400 });
    }

    const [updated] = await prisma.$transaction([
      prisma.contract.update({
        where: { id: Number(id) },
        data: {
          status:            'terminated',
          terminationDate:   terminationDate ? new Date(terminationDate) : new Date(),
          terminationReason: terminationReason ?? null,
        },
      }),
      // Unit'i boşalt
      prisma.unit.update({
        where: { id: contract.unitId },
        data:  { status: 'vacant' },
      }),
    ]);

    return NextResponse.json(updated);
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
