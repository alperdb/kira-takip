import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getUserDb } from '@/lib/user-db';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
    const db = getUserDb(session.id);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const in7  = new Date(today); in7.setDate(today.getDate() + 7);
    const in30 = new Date(today); in30.setDate(today.getDate() + 30);

    // 1. Vadesi geçmiş alacaklar (overdue)
    const overdue = await db.rentCharge.findMany({
      where: { status: 'overdue' },
      select: {
        id: true, dueDate: true, chargeAmount: true,
        tenant: { select: { name: true } },
        unit:   { select: { unitNo: true, property: { select: { title: true } } } },
      },
      orderBy: { dueDate: 'asc' },
      take: 10,
    });

    // 2. Yaklaşan ödemeler (7 gün içinde, pending/partial)
    const upcoming = await db.rentCharge.findMany({
      where: {
        status: { in: ['pending', 'partial'] },
        dueDate: { gte: today, lte: in7 },
      },
      select: {
        id: true, dueDate: true, chargeAmount: true, paidAmount: true,
        tenant: { select: { name: true } },
        unit:   { select: { unitNo: true, property: { select: { title: true } } } },
      },
      orderBy: { dueDate: 'asc' },
      take: 10,
    });

    // 3. Sözleşme bitiş uyarıları (30 gün içinde)
    const expiringContracts = await db.contract.findMany({
      where: {
        status: 'active',
        endDate: { gte: today, lte: in30 },
      },
      select: {
        id: true, endDate: true,
        tenant: { select: { name: true } },
        unit:   { select: { unitNo: true, property: { select: { title: true } } } },
      },
      orderBy: { endDate: 'asc' },
      take: 10,
    });

    const notifications = [
      ...overdue.map(c => ({
        id:      `overdue-${c.id}`,
        type:    'overdue' as const,
        title:   'Vadesi Geçmiş Ödeme',
        body:    `${c.tenant.name} — ${c.unit.property.title} Daire ${c.unit.unitNo}`,
        date:    c.dueDate,
        href:    `/charges?status=overdue`,
      })),
      ...upcoming.map(c => ({
        id:      `upcoming-${c.id}`,
        type:    'upcoming' as const,
        title:   'Yaklaşan Ödeme',
        body:    `${c.tenant.name} — ${c.unit.property.title} Daire ${c.unit.unitNo}`,
        date:    c.dueDate,
        href:    `/charges`,
      })),
      ...expiringContracts
        .filter(c => c.endDate !== null)
        .map(c => ({
          id:      `expiring-${c.id}`,
          type:    'expiring' as const,
          title:   'Sözleşme Bitiyor',
          body:    `${c.tenant.name} — ${c.unit.property.title} Daire ${c.unit.unitNo}`,
          date:    c.endDate as Date,
          href:    `/contracts/${c.id}`,
        })),
    ];

    // Sort: overdue first, then by date
    notifications.sort((a, b) => {
      const order = { overdue: 0, upcoming: 1, expiring: 2 };
      if (order[a.type] !== order[b.type]) return order[a.type] - order[b.type];
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });

    return NextResponse.json({ notifications, count: notifications.length });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
