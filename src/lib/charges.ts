import type { PrismaClient } from '@prisma/client';
import { getRate } from './tcmb';
import { computeChargeStatus } from './chargeStatus';

// ─── Kira artış hesabı (pure — ayrı dosyada, buradan re-export) ─
export { calcRentIncrease } from './rentCalc';

// ─── Geçerli kira miktarı (son artış veya başlangıç) ─────────
export async function getEffectiveRentAmount(
  db: PrismaClient,
  contractId: number,
  asOfDate: Date,
): Promise<number> {
  const lastIncrease = await db.contractIncrease.findFirst({
    where: { contractId, effectiveDate: { lte: asOfDate } },
    orderBy: { effectiveDate: 'desc' },
  });
  if (lastIncrease) return Number(lastIncrease.newAmount);

  const contract = await db.contract.findUnique({ where: { id: contractId } });
  if (!contract) throw new Error(`Contract ${contractId} not found`);
  return Number(contract.rentAmount);
}

// ─── Aylık tahakkuk üret (idempotent) ────────────────────────
// Business rule: no proration — always full monthly amount, regardless of start day.
export async function generateMonthlyCharges(db: PrismaClient, targetDate: Date): Promise<number> {
  const periodStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
  const periodEnd   = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0);

  const activeContracts = await db.contract.findMany({
    where: {
      status:    'active',
      startDate: { lte: periodEnd },
      OR: [{ endDate: null }, { endDate: { gte: periodStart } }],
    },
  });

  let created = 0;

  for (const contract of activeContracts) {
    // İdempotent: bu dönem için zaten var mı?
    const exists = await db.rentCharge.findUnique({
      where: { contractId_periodStart: { contractId: contract.id, periodStart } },
    });
    if (exists) continue;

    // Ödeme günü (max 28 — schema constraint)
    const dueDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), contract.paymentDay);

    // Full monthly amount — no proration per business rule
    const chargeAmount = await getEffectiveRentAmount(db, contract.id, dueDate);

    // ── Dövizli sözleşmeler için TCMB kuru ──────────────────
    let exchangeRate:    number | undefined;
    let chargeAmountTry: number | undefined;

    if (contract.currency !== 'TRY') {
      const rate = await getRate(contract.currency);
      if (rate === null) {
        throw new Error(
          `${contract.currency} için TCMB kur verisi alınamadı — ` +
          `alacak oluşturulamadı (contract: ${contract.id})`,
        );
      }
      exchangeRate    = rate;
      chargeAmountTry = Math.round(chargeAmount * rate * 100) / 100;
    }

    await db.rentCharge.create({
      data: {
        contractId:      contract.id,
        unitId:          contract.unitId,
        tenantId:        contract.tenantId,
        dueDate,
        chargeAmount,
        periodStart,
        periodEnd,
        status:          'pending',
        exchangeRate,
        chargeAmountTry,
      },
    });
    created++;
  }

  return created;
}

// ─── Gecikme durumunu güncelle ───────────────────────────────
export async function updateOverdueStatuses(db: PrismaClient, graceDays = 5): Promise<number> {
  const cutoff = new Date();
  cutoff.setHours(0, 0, 0, 0);
  cutoff.setDate(cutoff.getDate() - graceDays);

  const result = await db.rentCharge.updateMany({
    where: {
      status:  { in: ['pending', 'partial'] },
      dueDate: { lt: cutoff },
    },
    data: { status: 'overdue' },
  });
  return result.count;
}

// ─── Ödeme uygula (FIFO) ─────────────────────────────────────
export async function applyPayment(
  db: PrismaClient,
  contractId: number,
  totalAmount: number,
  method: string,
  referenceNo?: string,
  notes?: string,
  paidAt?: Date,
): Promise<{ applied: number; remaining: number; chargesUpdated: number }> {
  const openCharges = await db.rentCharge.findMany({
    where: {
      contractId,
      status: { in: ['pending', 'partial', 'overdue'] },
    },
    orderBy: { dueDate: 'asc' }, // FIFO: en eski önce
  });

  let remaining      = totalAmount;
  let chargesUpdated = 0;
  const paymentTime  = paidAt ?? new Date();

  for (const charge of openCharges) {
    if (remaining <= 0) break;

    const owed = Math.max(0, Number(charge.chargeAmount) - Number(charge.paidAmount));
    if (owed === 0) continue; // stale status — skip silently

    const paying = Math.min(remaining, owed);

    await db.payment.create({
      data: {
        rentChargeId: charge.id,
        amount:       paying,
        paidAt:       paymentTime,
        method:       method as 'cash' | 'bank' | 'eft' | 'check' | 'other',
        referenceNo,
        notes,
      },
    });

    const newPaid   = Number(charge.paidAmount) + paying;
    const newStatus = computeChargeStatus(newPaid, Number(charge.chargeAmount), charge.dueDate);
    await db.rentCharge.update({
      where: { id: charge.id },
      data:  { paidAmount: newPaid, status: newStatus },
    });

    remaining -= paying;
    chargesUpdated++;
  }

  return { applied: totalAmount - remaining, remaining, chargesUpdated };
}
