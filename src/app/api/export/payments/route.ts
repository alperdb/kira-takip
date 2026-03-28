import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getUserDb } from '@/lib/user-db';
import { fmtDate, fmtMoney, csvRow } from '@/lib/csv';

const METHOD_LABELS: Record<string, string> = {
  bank:  'Banka',
  cash:  'Nakit',
  eft:   'EFT',
  check: 'Çek',
  other: 'Diğer',
};

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
    const db = getUserDb(session.id);

    const payments = await db.payment.findMany({
      include: {
        rentCharge: {
          select: {
            periodStart: true,
            periodEnd:   true,
            tenant:   { select: { name: true } },
            unit:     { select: { unitNo: true, property: { select: { title: true } } } },
            contract: { select: { id: true } },
          },
        },
      },
      orderBy: { paidAt: 'desc' },
    });

    const header = csvRow([
      'Ödeme No', 'Sözleşme No', 'Bina', 'Daire No', 'Kiracı',
      'Ödeme Tarihi', 'Dönem', 'Tutar', 'Yöntem', 'Referans No', 'Notlar',
    ]);

    const rows = payments.map(p => {
      const periodEnd = fmtDate(p.rentCharge.periodEnd);
      const period    = periodEnd
        ? `${fmtDate(p.rentCharge.periodStart)} – ${periodEnd}`
        : fmtDate(p.rentCharge.periodStart);
      return csvRow([
        String(p.id),
        String(p.rentCharge.contract.id),
        p.rentCharge.unit.property.title,
        p.rentCharge.unit.unitNo,
        p.rentCharge.tenant.name,
        fmtDate(p.paidAt),
        period,
        fmtMoney(p.amount),
        METHOD_LABELS[p.method] ?? p.method,
        p.referenceNo ?? '',
        p.notes ?? '',
      ]);
    });

    const csv = '\uFEFF' + [header, ...rows].join('\r\n');
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="odemeler-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
