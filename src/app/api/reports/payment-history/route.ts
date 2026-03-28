import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getUserDb } from '@/lib/user-db';

const METHOD_LABELS: Record<string, string> = {
  cash:  'Nakit',
  bank:  'Banka',
  eft:   'EFT',
  check: 'Çek',
  other: 'Diğer',
};

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
    const db = getUserDb(session.id);

    const { searchParams } = new URL(req.url);
    const from       = searchParams.get('from');
    const to         = searchParams.get('to');
    const tenantId   = searchParams.get('tenantId');
    const propertyId = searchParams.get('propertyId');

    const payments = await db.payment.findMany({
      where: {
        ...(from || to ? {
          paidAt: {
            ...(from ? { gte: new Date(from) }            : {}),
            ...(to   ? { lte: new Date(to + 'T23:59:59') } : {}),
          },
        } : {}),
        rentCharge: {
          ...(tenantId   ? { tenantId: Number(tenantId) }                             : {}),
          ...(propertyId ? { unit: { propertyId: Number(propertyId) } }               : {}),
        },
      },
      select: {
        id:          true,
        amount:      true,
        paidAt:      true,
        method:      true,
        referenceNo: true,
        rentCharge: {
          select: {
            id:       true,
            contract: { select: { id: true } },
            tenant:   { select: { name: true } },
            unit:     { select: { unitNo: true, property: { select: { title: true } } } },
          },
        },
      },
      orderBy: { paidAt: 'desc' },
      take: 300,
    });

    const result = payments.map(p => ({
      id:           p.id,
      paidAt:       p.paidAt,
      amount:       Number(p.amount),
      method:       METHOD_LABELS[p.method] ?? p.method,
      referenceNo:  p.referenceNo ?? null,
      tenantName:   p.rentCharge.tenant.name,
      property:     p.rentCharge.unit.property.title,
      unit:         p.rentCharge.unit.unitNo,
      chargeId:     p.rentCharge.id,
      contractId:   p.rentCharge.contract.id,
    }));

    return NextResponse.json(result);
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
