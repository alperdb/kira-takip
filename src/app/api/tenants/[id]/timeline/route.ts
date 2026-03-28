import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getUserDb } from '@/lib/user-db';

const TR_MONTHS = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
function fmtMonth(d: Date | string): string {
  const dt = new Date(d);
  return `${TR_MONTHS[dt.getMonth()]} ${dt.getFullYear()}`;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
    const db = getUserDb(session.id);

    const { id } = await params;
    const tenantId = Number(id);

    const [contracts, charges, payments] = await Promise.all([
      db.contract.findMany({
        where: { tenantId },
        select: {
          id: true, startDate: true, endDate: true, status: true,
          unit: { select: { unitNo: true, property: { select: { title: true } } } },
        },
        orderBy: { startDate: 'asc' },
      }),
      db.rentCharge.findMany({
        where: { tenantId, status: 'overdue' },
        select: {
          id: true, dueDate: true, chargeAmount: true, periodStart: true,
          unit: { select: { unitNo: true, property: { select: { title: true } } } },
        },
        orderBy: { dueDate: 'desc' },
        take: 30,
      }),
      db.payment.findMany({
        where: { rentCharge: { tenantId } },
        select: {
          id: true, amount: true, paidAt: true, method: true,
          rentCharge: {
            select: {
              periodStart: true,
              unit: { select: { unitNo: true, property: { select: { title: true } } } },
            },
          },
        },
        orderBy: { paidAt: 'desc' },
        take: 50,
      }),
    ]);

    type Event = {
      id: string;
      type: 'contract_start' | 'contract_end' | 'payment' | 'overdue';
      date: string;
      title: string;
      detail: string;
      amount?: number;
      href?: string;
    };

    const events: Event[] = [];

    for (const c of contracts) {
      const loc = `${c.unit.property.title} · ${c.unit.unitNo}`;
      events.push({
        id:    `cs-${c.id}`,
        type:  'contract_start',
        date:  c.startDate.toISOString(),
        title: 'Sözleşme Başladı',
        detail: loc,
        href:  `/contracts/${c.id}`,
      });
      if (c.endDate && (c.status === 'terminated' || c.status === 'renewed')) {
        events.push({
          id:    `ce-${c.id}`,
          type:  'contract_end',
          date:  c.endDate.toISOString(),
          title: c.status === 'renewed' ? 'Sözleşme Yenilendi' : 'Sözleşme Sona Erdi',
          detail: loc,
          href:  `/contracts/${c.id}`,
        });
      }
    }

    for (const p of payments) {
      const mon = fmtMonth(p.rentCharge.periodStart);
      events.push({
        id:    `pay-${p.id}`,
        type:  'payment',
        date:  new Date(p.paidAt).toISOString(),
        title: 'Ödeme Yapıldı',
        detail: `${p.rentCharge.unit.property.title} · ${p.rentCharge.unit.unitNo} — ${mon}`,
        amount: Number(p.amount),
      });
    }

    for (const c of charges) {
      const mon = fmtMonth(c.periodStart);
      events.push({
        id:    `ov-${c.id}`,
        type:  'overdue',
        date:  c.dueDate.toISOString(),
        title: 'Gecikmiş Alacak',
        detail: `${c.unit.property.title} · ${c.unit.unitNo} — ${mon}`,
        amount: Number(c.chargeAmount),
      });
    }

    events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json(events);
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
