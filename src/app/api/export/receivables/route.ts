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

const STATUS_LABELS: Record<string, string> = {
  pending:  'Bekliyor',
  paid:     'Ödendi',
  partial:  'Kısmi',
  overdue:  'Gecikmiş',
};

export async function GET() {
  try {
    const charges = await prisma.rentCharge.findMany({
      include: {
        tenant:   { select: { name: true } },
        unit:     { select: { unitNo: true, property: { select: { title: true } } } },
        contract: { select: { id: true } },
      },
      orderBy: { dueDate: 'desc' },
    });

    const header = csvRow([
      'Alacak No', 'Sözleşme No', 'Bina', 'Daire No', 'Kiracı',
      'Dönem Başlangıcı', 'Dönem Bitişi', 'Vade Tarihi',
      'Alacak Tutarı', 'Ödenen Tutar', 'Kalan Tutar', 'Durum',
    ]);

    const rows = charges.map(c => {
      const kalan = Number(c.chargeAmount) - Number(c.paidAmount);
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
