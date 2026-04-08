export function computeFireTarget(
  monthlySpend: number,
  withdrawalRate: number,
): number {
  if (monthlySpend <= 0 || withdrawalRate <= 0) return 0;
  return (monthlySpend * 12) / withdrawalRate;
}

export function computeDownshiftTarget(
  monthlySpend: number,
  targetLowerMonthlyIncome: number,
  withdrawalRate: number,
): number {
  const gap = Math.max(0, monthlySpend - Math.max(0, targetLowerMonthlyIncome));
  return computeFireTarget(gap, withdrawalRate);
}

export function computeMonthsToTarget({
  currentBalance,
  targetBalance,
  monthlyContribution,
  annualRealReturn,
}: {
  currentBalance: number;
  targetBalance: number;
  monthlyContribution: number;
  annualRealReturn: number;
}): number | null {
  if (targetBalance <= 0 || currentBalance >= targetBalance) return 0;

  const monthlyRate = annualRealReturn / 12;

  if (monthlyRate === 0) {
    if (monthlyContribution <= 0) return null;
    return Math.ceil((targetBalance - currentBalance) / monthlyContribution);
  }

  if (currentBalance * monthlyRate + monthlyContribution <= 0) {
    return null;
  }

  const top = Math.log(
    (targetBalance * monthlyRate + monthlyContribution) /
      (currentBalance * monthlyRate + monthlyContribution),
  );
  const bottom = Math.log(1 + monthlyRate);

  if (bottom === 0 || top <= 0 || Number.isNaN(top) || !Number.isFinite(top)) {
    return null;
  }

  return Math.ceil(top / bottom);
}

export function projectMonthlyBalances({
  startBalance,
  monthlyContribution,
  annualRealReturn,
  months,
}: {
  startBalance: number;
  monthlyContribution: number;
  annualRealReturn: number;
  months: number;
}): number[] {
  const monthlyRate = annualRealReturn / 12;
  const balances: number[] = [];
  let balance = startBalance;

  for (let month = 0; month <= months; month++) {
    balances.push(Math.max(0, balance));
    balance = balance * (1 + monthlyRate) + monthlyContribution;
  }

  return balances;
}
