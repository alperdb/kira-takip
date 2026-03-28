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

    const charges = await db.rentCharge.findMany({
      include: {
        tenant:   { select: { name: true } },
        unit:     { select: { unitNo: true, property: { select: { title: true } } } },
        contract: { select: { id: true, currency: true } },
        payments: { orderBy: { paidAt: 'asc' } },
      },
      orderBy: [{ tenant: { name: 'asc' } }, { periodStart: 'desc' }],
    });

    const header = csvRow([
      'Kiracı', 'Mülk', 'Daire', 'Sözleşme No', 'Dönem',
      'Vade Tarihi', 'Alacak', 'Ödenen', 'Kalan', 'Durum',
      'Son Ödeme Tarihi', 'Ödeme Yöntemi',
    ]);

    const rows = charges.map(c => {
      const remaining = Math.max(0, Number(c.chargeAmount) - Number(c.paidAmount));
      const lastPay   = c.payments.at(-1);
      const statusMap: Record<string, string> = {
        paid: 'Ödendi', partial: 'Kısmi', overdue: 'Gecikmiş', pending: 'Bekliyor', waived: 'Silindi',
      };
      return csvRow([
        c.tenant.name,
        c.unit.property.title,
        c.unit.unitNo,
        c.contract.id,
        fmtDate(c.periodStart),
        fmtDate(c.dueDate),
        fmtMoney(Number(c.chargeAmount)),
        fmtMoney(Number(c.paidAmount)),
        fmtMoney(remaining),
        statusMap[c.status] ?? c.status,
        lastPay ? fmtDate(lastPay.paidAt) : '',
        lastPay ? (METHOD_LABELS[lastPay.method] ?? lastPay.method) : '',
      ]);
    });

    const csv = '\uFEFF' + [header, ...rows].join('\r\n');
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="kiraci-odeme-gecmisi-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
