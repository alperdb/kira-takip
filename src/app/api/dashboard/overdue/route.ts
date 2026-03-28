import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getUserDb } from '@/lib/user-db';

export async function GET(_req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
    const db = getUserDb(session.id);
    const now = new Date();

    const charges = await db.rentCharge.findMany({
      where: {
        status: { in: ['overdue', 'pending', 'partial'] },
        dueDate: { lt: now },
      },
      select: {
        id: true,
        dueDate: true,
        chargeAmount: true,
        paidAmount: true,
        tenant: { select: { id: true, name: true, phone: true } },
        unit: {
          select: {
            unitNo: true,
            property: { select: { id: true, title: true } },
          },
        },
      },
      orderBy: { dueDate: 'asc' },
    });

    const alerts = charges.map((c) => {
      const unpaidAmount = Math.round(Math.max(0, c.chargeAmount - c.paidAmount) * 100) / 100;
      const daysLate = Math.floor(
        (now.getTime() - c.dueDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      return {
        chargeId:     c.id,
        tenantId:     c.tenant.id,
        tenantName:   c.tenant.name,
        tenantPhone:  c.tenant.phone,
        propertyId:   c.unit.property.id,
        propertyTitle: c.unit.property.title,
        unitNo:       c.unit.unitNo,
        dueDate:      c.dueDate,
        unpaidAmount,
        daysLate,
      };
    });

    return NextResponse.json({ alerts, total: alerts.length });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
