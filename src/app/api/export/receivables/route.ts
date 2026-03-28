import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getUserDb } from '@/lib/user-db';
import { fmtDate, fmtMoney, csvRow } from '@/lib/csv';

const STATUS_LABELS: Record<string, string> = {
  pending:  'Bekliyor',
  paid:     'Ödendi',
  partial:  'Kısmi',
  overdue:  'Gecikmiş',
  waived:   'Silindi',
};

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
    const db = getUserDb(session.id);

    const charges = await db.rentCharge.findMany({
      include: {
        tenant:   { select: { name: true } },
        unit:     { select: { unitNo: true, property: { select: { title: true } } } },
        contract: { select: { id: true } },
      },
      orderBy: { dueDate: 'asc' },
    });

    const header = csvRow([
      'Alacak No', 'Sözleşme No', 'Bina', 'Daire No', 'Kiracı',
      'Dönem Başlangıcı', 'Dönem Bitişi', 'Vade Tarihi',
      'Alacak Tutarı', 'Ödenen Tutar', 'Kalan Tutar', 'Durum',
    ]);

    const rows = charges.map(c => {
      const kalan = Math.max(0, Number(c.chargeAmount) - Number(c.paidAmount));
      return csvRow([
        String(c.id),
        String(c.contract.id),
        c.unit.property.title,
        c.unit.unitNo,
        c.tenant.name,
        fmtDate(c.periodStart),
        fmtDate(c.periodEnd),
        fmtDate(c.dueDate),
        fmtMoney(c.chargeAmount),
        fmtMoney(c.paidAmount),
        fmtMoney(kalan),
        STATUS_LABELS[c.status] ?? c.status,
      ]);
    });

    const csv = '\uFEFF' + [header, ...rows].join('\r\n');
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="alacaklar-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
