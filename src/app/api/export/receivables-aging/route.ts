import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getUserDb } from '@/lib/user-db';
import { fmtDate, fmtMoney, csvRow } from '@/lib/csv';

function agingBucket(days: number): string {
  if (days <= 30) return '1–30 gün';
  if (days <= 60) return '31–60 gün';
  if (days <= 90) return '61–90 gün';
  return '90+ gün';
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
    const db = getUserDb(session.id);

    // Only overdue receivables
    const charges = await db.rentCharge.findMany({
      where: { status: 'overdue' },
      include: {
        tenant:   { select: { name: true, phone: true } },
        unit:     { select: { unitNo: true, property: { select: { title: true } } } },
        contract: { select: { id: true } },
      },
      orderBy: { dueDate: 'asc' },
    });

    const header = csvRow([
      'Kiracı', 'Telefon', 'Mülk', 'Daire', 'Sözleşme No', 'Dönem',
      'Vade Tarihi', 'Alacak', 'Ödenen', 'Kalan',
      'Gecikme (gün)', 'Yaş Grubu',
    ]);

    const now = Date.now();
    const rows = charges.map(c => {
      const overdueDays = Math.max(1, Math.floor((now - new Date(c.dueDate).getTime()) / 86_400_000));
      const remaining   = Math.max(0, Number(c.chargeAmount) - Number(c.paidAmount));
      return csvRow([
        c.tenant.name,
        c.tenant.phone ?? '',
        c.unit.property.title,
        c.unit.unitNo,
        c.contract.id,
        fmtDate(c.periodStart),
        fmtDate(c.dueDate),
        fmtMoney(Number(c.chargeAmount)),
        fmtMoney(Number(c.paidAmount)),
        fmtMoney(remaining),
        overdueDays,
        agingBucket(overdueDays),
      ]);
    });

    const csv = '\uFEFF' + [header, ...rows].join('\r\n');
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="gecikmiş-alacaklar-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
