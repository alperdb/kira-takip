/**
 * Receivable (RentCharge) status hesaplama — tek yer.
 *
 * Kural sırası (öncelik yüksekten düşüğe):
 *  1. paid     — toplamPaid >= amount
 *  2. overdue  — bugün > dueDate  (pending ve partial'ı override eder)
 *  3. partial  — 0 < paid < amount
 *  4. pending  — paid == 0
 *
 * Negatif kalan bakiye mümkün değil; çağıran taraf Math.max(0, …) ile korumalı.
 */
export type ChargeStatus = 'paid' | 'overdue' | 'partial' | 'pending' | 'waived';

export function computeChargeStatus(
  paidAmount:   number,
  chargeAmount: number,
  dueDate:      Date,
): ChargeStatus {
  if (paidAmount >= chargeAmount) return 'paid';

  // Compare at day granularity — a charge due today is NOT yet overdue
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const due   = new Date(dueDate); due.setHours(0, 0, 0, 0);
  if (today > due)         return 'overdue';

  if (paidAmount > 0)      return 'partial';
  return 'pending';
}
