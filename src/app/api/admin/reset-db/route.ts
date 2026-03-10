import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST() {
  try {
    // Sıralı silme — foreign key kısıtları nedeniyle alt tablolar önce
    await prisma.$transaction([
      prisma.payment.deleteMany(),
      prisma.rentCharge.deleteMany(),
      prisma.contractIncrease.deleteMany(),
      prisma.depositTransaction.deleteMany(),
      prisma.contract.deleteMany(),
      prisma.expense.deleteMany(),
      prisma.tenant.deleteMany(),
      prisma.unit.deleteMany(),
      prisma.property.deleteMany(),
      prisma.owner.deleteMany(),
      prisma.exchangeRate.deleteMany(),
    ]);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
