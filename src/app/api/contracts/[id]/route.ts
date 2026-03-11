import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const contract = await prisma.contract.findUnique({
      where: { id: Number(id) },
      include: {
        unit: {
          include: {
            property: { include: { owner: { select: { id: true, name: true, phone: true } } } },
          },
        },
        tenant: true,
        increases:           { orderBy: { effectiveDate: 'asc' } },
        depositTransactions: { orderBy: { date: 'asc' } },
        rentCharges: {
          orderBy: { periodStart: 'desc' },
          take: 12,
          include: { payments: true },
        },
      },
    });
    if (!contract) return NextResponse.json({ error: 'Bulunamadı' }, { status: 404 });
    return NextResponse.json(contract);
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const contractId = Number(id);
    const body = await req.json();
    const { endDate, paymentDay, startDate, rentAmount, tenantId, unitId } = body;

    if (paymentDay !== undefined && (Number(paymentDay) < 1 || Number(paymentDay) > 28)) {
      return NextResponse.json({ error: 'paymentDay 1-28 arası olmalı' }, { status: 400 });
    }
    if (startDate && endDate && endDate <= startDate) {
      return NextResponse.json({ error: 'Bitiş tarihi başlangıçtan sonra olmalı' }, { status: 400 });
    }

    // If unit is changing, update unit statuses
    if (unitId !== undefined) {
      const current = await prisma.contract.findUnique({ where: { id: contractId }, select: { unitId: true } });
      if (current && current.unitId !== Number(unitId)) {
        await prisma.$transaction([
          prisma.unit.update({ where: { id: current.unitId }, data: { status: 'vacant' } }),
          prisma.unit.update({ where: { id: Number(unitId) }, data: { status: 'occupied' } }),
        ]);
      }
    }

    const contract = await prisma.contract.update({
      where: { id: contractId },
      data: {
        ...(startDate   !== undefined && { startDate:   new Date(startDate) }),
        ...(endDate     !== undefined && { endDate:     endDate ? new Date(endDate) : null }),
        ...(paymentDay  !== undefined && { paymentDay:  Number(paymentDay) }),
        ...(rentAmount  !== undefined && { rentAmount:  Number(rentAmount) }),
        ...(tenantId    !== undefined && { tenantId:    Number(tenantId) }),
        ...(unitId      !== undefined && { unitId:      Number(unitId) }),
      },
    });
    return NextResponse.json(contract);
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const contract = await prisma.contract.findUnique({
      where: { id: Number(id) },
      include: { _count: { select: { rentCharges: true } } },
    });
    if (!contract) return NextResponse.json({ error: 'Bulunamadı' }, { status: 404 });
    if (contract.status === 'active') {
      return NextResponse.json(
        { error: 'Aktif sözleşmeler silinemez. Önce sözleşmeyi sonlandırın.' },
        { status: 409 },
      );
    }
    if (contract._count.rentCharges > 0) {
      return NextResponse.json(
        { error: `Bu sözleşmeye ait ${contract._count.rentCharges} alacak kaydı var. Silmek için önce alacakları kaldırın.` },
        { status: 409 },
      );
    }
    // İlişkili kayıtları cascade sil
    await prisma.$transaction([
      prisma.contractIncrease.deleteMany({ where: { contractId: Number(id) } }),
      prisma.depositTransaction.deleteMany({ where: { contractId: Number(id) } }),
      prisma.contract.delete({ where: { id: Number(id) } }),
    ]);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
