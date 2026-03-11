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

function agingBucket(days: number): string {
  if (days <= 0)  return 'Vadesi Gelmedi';
  if (days <= 30) return '1–30 gün';
  if (days <= 60) return '31–60 gün';
  if (days <= 90) return '61–90 gün';
  return '90+ gün';
}

export async function GET() {
  try {
    const charges = await prisma.rentCharge.findMany({
      where: { status: { in: ['overdue', 'pending', 'partial'] } },
      include: {
        tenant:   { select: { name: true } },
        unit:     { select: { unitNo: true, property: { select: { title: true } } } },
        contract: { select: { id: true } },
      },
      orderBy: { dueDate: 'asc' },
    });

    const header = csvRow([
      'Kiracı', 'Mülk', 'Daire', 'Sözleşme No', 'Dönem',
      'Vade Tarihi', 'Alacak (₺)', 'Ödenen (₺)', 'Kalan (₺)',
      'Gecikme (gün)', 'Yaş Grubu', 'Durum',
    ]);

    const now = Date.now();
    const rows = charges.map(c => {
      const overdueDays = Math.floor((now - new Date(c.dueDate).getTime()) / 86_400_000);
      const remaining   = c.chargeAmount - c.paidAmount;
      const statusMap: Record<string, string> = {
        partial: 'Kısmi', overdue: 'Gecikti', pending: 'Bekliyor',
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
        overdueDays > 0 ? overdueDays : 0,
        agingBucket(overdueDays),
        statusMap[c.status] ?? c.status,
      ]);
    });

    const csv = '\uFEFF' + [header, ...rows].join('\r\n');
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="alacak-yaslandirma-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
