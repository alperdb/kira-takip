import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generateMonthlyCharges, updateOverdueStatuses } from '@/lib/charges';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status     = searchParams.get('status');
    const contractId = searchParams.get('contract_id');
    const unitId     = searchParams.get('unit_id');
    const ownerId    = searchParams.get('ownerId');
    const from       = searchParams.get('from');
    const to         = searchParams.get('to');

    const charges = await prisma.rentCharge.findMany({
      where: {
        ...(status     ? { status: status as 'pending' | 'partial' | 'paid' | 'overdue' | 'waived' } : {}),
        ...(contractId ? { contractId: Number(contractId) } : {}),
        ...(unitId     ? { unitId:     Number(unitId) }     : {}),
        ...(ownerId    ? { unit: { property: { ownerId: Number(ownerId) } } } : {}),
        ...(from || to ? {
          periodStart: {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to   ? { lte: new Date(to)   } : {}),
          },
        } : {}),
      },
      include: {
        tenant:   { select: { id: true, name: true } },
        unit:     { select: { id: true, unitNo: true, property: { select: { id: true, title: true } } } },
        contract: { select: { currency: true } },
        payments: true,
      },
      orderBy: [{ periodStart: 'desc' }, { dueDate: 'asc' }],
    });
    return NextResponse.json(charges);
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

// Manuel tahakkuk tetikle: POST /api/charges/generate
export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');

    if (action === 'generate') {
      const body = await req.json().catch(() => ({}));
      const targetDate = body.date ? new Date(body.date) : new Date();
      const created    = await generateMonthlyCharges(targetDate);
      return NextResponse.json({ created, targetDate });
    }

    if (action === 'update-overdue') {
      const body      = await req.json().catch(() => ({}));
      const updated   = await updateOverdueStatuses(body.graceDays ?? 5);
      return NextResponse.json({ updated });
    }

    return NextResponse.json({ error: 'action=generate veya action=update-overdue gerekli' }, { status: 400 });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
