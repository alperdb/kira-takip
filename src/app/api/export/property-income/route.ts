import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getUserDb } from '@/lib/user-db';
import { fmtMoney, csvRow } from '@/lib/csv';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
    const db = getUserDb(session.id);

    const properties = await db.property.findMany({
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
      const totalCharged = allCharges.reduce((s, c) => s + Number(c.chargeAmount), 0);
      const totalPaid    = allCharges.reduce((s, c) => s + Number(c.paidAmount),   0);
      const totalLeft    = Math.max(0, totalCharged - totalPaid);
      const rate         = totalCharged > 0 ? Math.round((totalPaid / totalCharged) * 100) : 0;

      const occupiedUnits = p.units.filter(u => u.status === 'occupied').length;

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
