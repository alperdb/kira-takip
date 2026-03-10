/** Pure rent calculation utilities — safe to import in client components. */

export function calcRentIncrease(
  currentRent: number,
  ratePercent: number,
): { newRent: number; increaseAmount: number } {
  const increaseAmount = Math.round(currentRent * (ratePercent / 100) * 100) / 100;
  const newRent        = Math.round((currentRent + increaseAmount) * 100) / 100;
  return { newRent, increaseAmount };
}
