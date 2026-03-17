import { prisma } from './db';
import { getRate } from './tcmb';
import { computeChargeStatus } from './chargeStatus';

// ─── Kira artış hesabı (pure — ayrı dosyada, buradan re-export) ─
export { calcRentIncrease } from './rentCalc';

// ─── Geçerli kira miktarı (son artış veya başlangıç) ─────────
export async function getEffectiveRentAmount(contractId: number, asOfDate: Date): Promise<number> {
  const lastIncrease = await prisma.contractIncrease.findFirst({
    where: { contractId, effectiveDate: { lte: asOfDate } },
    orderBy: { effectiveDate: 'desc' },
  });
  if (lastIncrease) return Number(lastIncrease.newAmount);

  const contract = await prisma.contract.findUnique({ where: { id: contractId } });
  if (!contract) throw new Error(`Contract ${contractId} not found`);
  return Number(contract.rentAmount);
}

// ─── İlk ay orantılı hesap ───────────────────────────────────
function prorateAmount(amount: number, startDate: Date, periodStart: Date): number {
  const year  = periodStart.getFullYear();
  const month = periodStart.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startDay    = startDate.getDate();
  const daysActive  = daysInMonth - startDay + 1;
  return Math.round((amount / daysInMonth) * daysActive * 100) / 100;
}

function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

// ─── Aylık tahakkuk üret (idempotent) ────────────────────────
export async function generateMonthlyCharges(targetDate: Date): Promise<number> {
  const periodStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
  const periodEnd   = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0);

  const activeContracts = await prisma.contract.findMany({
    where: {
      status:     'active',
      startDate:  { lte: periodEnd },
      OR: [{ endDate: null }, { endDate: { gte: periodStart } }],
    },
  });

  let created = 0;

  for (const contract of activeContracts) {
    // İdempotent: bu dönem için zaten var mı?
    const exists = await prisma.rentCharge.findUnique({
      where: { contractId_periodStart: { contractId: contract.id, periodStart } },
    });
    if (exists) continue;

    // Ödeme günü (max 28 — schema constraint)
    const dueDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), contract.paymentDay);

    const chargeAmount = await getEffectiveRentAmount(contract.id, dueDate);

    // İlk ay prorate
    const isFirstMonth = isSameMonth(contract.startDate, periodStart);
    const finalAmount  = isFirstMonth
      ? prorateAmount(chargeAmount, contract.startDate, periodStart)
      : chargeAmount;

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
      chargeAmountTry = Math.round(finalAmount * rate * 100) / 100;
    }

    await prisma.rentCharge.create({
      data: {
        contractId:      contract.id,
        unitId:          contract.unitId,
        tenantId:        contract.tenantId,
        dueDate,
        chargeAmount:    finalAmount,
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
export async function updateOverdueStatuses(graceDays = 5): Promise<number> {
  const cutoff = new Date();
  cutoff.setHours(0, 0, 0, 0);
  cutoff.setDate(cutoff.getDate() - graceDays);

  const result = await prisma.rentCharge.updateMany({
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
  contractId: number,
  totalAmount: number,
  method: string,
  referenceNo?: string,
  notes?: string,
  paidAt?: Date,
): Promise<{ applied: number; remaining: number; chargesUpdated: number }> {
  const openCharges = await prisma.rentCharge.findMany({
    where: {
      contractId,
      status: { in: ['pending', 'partial', 'overdue'] },
    },
    orderBy: { dueDate: 'asc' }, // FIFO: en eski önce
  });

  let remaining       = totalAmount;
  let chargesUpdated  = 0;
  const paymentTime   = paidAt ?? new Date();

  for (const charge of openCharges) {
    if (remaining <= 0) break;

    const owed   = Math.max(0, Number(charge.chargeAmount) - Number(charge.paidAmount));
    if (owed === 0) continue; // stale status — skip silently

    const paying = Math.min(remaining, owed);

    await prisma.payment.create({
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
    await prisma.rentCharge.update({
      where: { id: charge.id },
      data: {
        paidAmount: newPaid,
        status:     newStatus,
      },
    });

    remaining -= paying;
    chargesUpdated++;
  }

  return { applied: totalAmount - remaining, remaining, chargesUpdated };
}
