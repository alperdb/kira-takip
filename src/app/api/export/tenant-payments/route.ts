import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

function fmtDate(d: Date | string | null): string {
  if (!d) return '';
  return new Date(d).toLocaleDateString('tr-TR');
}

function fmtMoney(n: number): string {
  return n.toLocaleString('tr-TR', { minimumFractionDigits: 2 });
}

function csvRow(cols: (string | number)[]): string {
  return cols.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',');
}

export async function GET() {
  try {
    const charges = await prisma.rentCharge.findMany({
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
      const remaining = c.chargeAmount - c.paidAmount;
      const lastPay   = c.payments.at(-1);
      const statusMap: Record<string, string> = {
        paid: 'Ödendi', partial: 'Kısmi', overdue: 'Gecikti', pending: 'Bekliyor',
      };
      return csvRow([
        c.tenant.name,
        c.unit.property.title,
        c.unit.unitNo,
        c.contract.id,
        fmtDate(c.periodStart),
        fmtDate(c.dueDate),
        fmtMoney(c.chargeAmount),
        fmtMoney(c.paidAmount),
        fmtMoney(remaining),
        statusMap[c.status] ?? c.status,
        lastPay ? fmtDate(lastPay.paidAt) : '',
        lastPay?.method ?? '',
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
