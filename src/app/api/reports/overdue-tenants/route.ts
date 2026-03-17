import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const charges = await prisma.rentCharge.findMany({
      where: { status: 'overdue' },
      select: {
        id:           true,
        dueDate:      true,
        chargeAmount: true,
        paidAmount:   true,
        periodStart:  true,
        tenant: { select: { id: true, name: true, phone: true } },
        unit:   { select: { unitNo: true, property: { select: { title: true } } } },
      },
      orderBy: { dueDate: 'asc' },
    });

    const rows = charges.map(c => ({
      chargeId:    c.id,
      tenantId:    c.tenant.id,
      tenantName:  c.tenant.name,
      tenantPhone: c.tenant.phone,
      property:    c.unit.property.title,
      unitNo:      c.unit.unitNo,
      dueDate:     c.dueDate,
      periodStart: c.periodStart,
      overdue:     Math.round(Math.max(0, Number(c.chargeAmount) - Number(c.paidAmount)) * 100) / 100,
    }));

    const totalOverdue = Math.round(rows.reduce((s, r) => s + r.overdue, 0) * 100) / 100;

    return NextResponse.json({ rows, totalOverdue, count: rows.length });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
