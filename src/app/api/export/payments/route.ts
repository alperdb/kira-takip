import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

function fmtDate(d: Date | string | null): string {
  if (!d) return '';
  return new Date(d).toLocaleDateString('tr-TR');
}

function fmtMoney(n: number | { toString(): string }): string {
  return `₺${Number(n).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`;
}

function csvRow(cols: string[]): string {
  return cols.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(';');
}

const METHOD_LABELS: Record<string, string> = {
  bank:  'Banka',
  cash:  'Nakit',
  eft:   'EFT',
  check: 'Çek',
  other: 'Diğer',
};

export async function GET() {
  try {
    const payments = await prisma.payment.findMany({
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
      const period = `${fmtDate(p.rentCharge.periodStart)} – ${fmtDate(p.rentCharge.periodEnd)}`;
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
