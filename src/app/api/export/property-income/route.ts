import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

function fmtMoney(n: number): string {
  return n.toLocaleString('tr-TR', { minimumFractionDigits: 2 });
}

function csvRow(cols: (string | number)[]): string {
  return cols.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',');
}

export async function GET() {
  try {
    const properties = await prisma.property.findMany({
      include: {
        units: {
          include: {
            rentCharges: {
              include: { payments: true },
            },
          },
        },
      },
      orderBy: { title: 'asc' },
    });

    const header = csvRow([
      'Mülk', 'Toplam Daire', 'Dolu Daire', 'Boş Daire',
      'Toplam Alacak (₺)', 'Toplam Tahsilat (₺)', 'Toplam Kalan (₺)',
      'Tahsilat Oranı (%)',
    ]);

    const rows = properties.map(p => {
      const totalUnits   = p.units.length;
      const allCharges   = p.units.flatMap(u => u.rentCharges);
      const totalCharged = allCharges.reduce((s, c) => s + c.chargeAmount, 0);
      const totalPaid    = allCharges.reduce((s, c) => s + c.paidAmount, 0);
      const totalLeft    = totalCharged - totalPaid;
      const rate         = totalCharged > 0 ? Math.round((totalPaid / totalCharged) * 100) : 0;

      const occupiedUnits = p.units.filter(u =>
        u.rentCharges.some(c => c.status !== 'paid' || c.periodStart >= new Date(Date.now() - 90 * 86_400_000))
      ).length;

      return csvRow([
        p.title,
        totalUnits,
        occupiedUnits,
        totalUnits - occupiedUnits,
        fmtMoney(totalCharged),
        fmtMoney(totalPaid),
        fmtMoney(totalLeft),
        rate,
      ]);
    });

    const csv = '\uFEFF' + [header, ...rows].join('\r\n');
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="mulk-gelir-raporu-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
