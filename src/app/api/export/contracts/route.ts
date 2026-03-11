import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

function fmtDate(d: Date | string | null): string {
  if (!d) return '';
  return new Date(d).toLocaleDateString('tr-TR');
}

function fmtCurrency(n: number | { toString(): string }, cur = 'TRY'): string {
  return `${Number(n).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ${cur}`;
}

function csvRow(cols: string[]): string {
  return cols.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',');
}

export async function GET() {
  try {
    const contracts = await prisma.contract.findMany({
      include: {
        unit:   { select: { unitNo: true, property: { select: { title: true } } } },
        tenant: { select: { name: true, phone: true, email: true } },
      },
      orderBy: { startDate: 'desc' },
    });

    const header = csvRow([
      'Sözleşme No', 'Bina', 'Daire No', 'Kiracı', 'Telefon', 'E-posta',
      'Başlangıç', 'Bitiş', 'Aylık Kira', 'Kira Para Birimi',
      'Depozito', 'Ödeme Günü', 'Durum',
    ]);

    const rows = contracts.map(c =>
      csvRow([
        String(c.id),
        c.unit.property.title,
        c.unit.unitNo,
        c.tenant.name,
        c.tenant.phone ?? '',
        c.tenant.email ?? '',
        fmtDate(c.startDate),
        fmtDate(c.endDate),
        fmtCurrency(c.rentAmount, c.currency),
        c.currency,
        fmtCurrency(c.depositAmount, c.currency),
        String(c.paymentDay),
        c.status === 'active' ? 'Aktif' : c.status === 'terminated' ? 'Sonlandırıldı' : c.status === 'expired' ? 'Süresi Doldu' : c.status,
      ])
    );

    const csv = '\uFEFF' + [header, ...rows].join('\r\n');
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="sozlesmeler-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
