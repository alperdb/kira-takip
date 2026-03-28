import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getUserDb } from '@/lib/user-db';

const TR_MONTHS = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
function fmtMonth(d: Date | string): string {
  const dt = new Date(d);
  return `${TR_MONTHS[dt.getMonth()]} ${dt.getFullYear()}`;
}

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
    const db = getUserDb(session.id);

    const { id } = await params;
    const tenantId = Number(id);

    const charges = await db.rentCharge.findMany({
      where: { tenantId },
      select: {
        id: true,
        chargeAmount: true,
        periodStart: true,
        contract: { select: { id: true } },
        unit: { select: { unitNo: true, property: { select: { title: true } } } },
        payments: {
          orderBy: { paidAt: 'asc' },
          select: { id: true, amount: true, paidAt: true, method: true, referenceNo: true, notes: true },
        },
      },
      orderBy: { periodStart: 'asc' },
    });

    const rows: {
      id:           number;
      paidAt:       string;
      amount:       number;
      method:       string;
      referenceNo:  string | null;
      notes:        string | null;
      chargePeriod: string;
      balanceAfter: number;
      unitLabel:    string;
      contractId:   number;
    }[] = [];

    for (const charge of charges) {
      let running = 0;
      const unitLabel = `${charge.unit.property.title} · ${charge.unit.unitNo}`;
      for (const p of charge.payments) {
        running += Number(p.amount);
        rows.push({
          id:           p.id,
          paidAt:       new Date(p.paidAt).toISOString(),
          amount:       Number(p.amount),
          method:       p.method,
          referenceNo:  p.referenceNo ?? null,
          notes:        p.notes ?? null,
          chargePeriod: fmtMonth(charge.periodStart),
          balanceAfter: Math.max(0, Number(charge.chargeAmount) - running),
          unitLabel,
          contractId:   charge.contract.id,
        });
      }
    }

    rows.sort((a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime());

    return NextResponse.json(rows);
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
