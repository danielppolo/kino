export type RetirementInflectionType = "downshift" | "full-fire";
export type FireProjectionPhase =
  | "accumulation"
  | "downshift-retired"
  | "full-fire-retired";

export interface FireProjectionMonthPoint {
  month: number;
  year: number;
  balance: number;
  cashflow: number;
  isForecast: boolean;
  phase: FireProjectionPhase;
}

export interface FireProjectionResult {
  points: FireProjectionMonthPoint[];
  retirementInflectionMonth: number | null;
  retirementInflectionYear: number | null;
  retirementInflectionType: RetirementInflectionType | null;
  fullFireReachedMonth: number | null;
  fullFireReachedYear: number | null;
  postRetirementMonthlyWithdrawal: number;
}

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

export function getDownshiftMonthlyWithdrawal(
  monthlySpend: number,
  targetLowerMonthlyIncome: number,
): number {
  return Math.max(0, monthlySpend - Math.max(0, targetLowerMonthlyIncome));
}

function getInitialPhase({
  startBalance,
  downshiftTarget,
  fullFireTarget,
}: {
  startBalance: number;
  downshiftTarget: number;
  fullFireTarget: number;
}): {
  phase: FireProjectionPhase;
  inflectionType: RetirementInflectionType | null;
} {
  if (fullFireTarget > 0 && startBalance >= fullFireTarget) {
    return { phase: "full-fire-retired", inflectionType: "full-fire" };
  }

  if (
    downshiftTarget > 0 &&
    downshiftTarget < fullFireTarget &&
    startBalance >= downshiftTarget
  ) {
    return { phase: "downshift-retired", inflectionType: "downshift" };
  }

  return { phase: "accumulation", inflectionType: null };
}

export function simulateFireProjection({
  annualRealReturn,
  downshiftTarget,
  forecastBalances = [],
  forecastCashflows = [],
  fullFireTarget,
  monthlySavings,
  monthlySpend,
  startBalance,
  targetLowerMonthlyIncome,
  totalMonths,
}: {
  annualRealReturn: number;
  downshiftTarget: number;
  forecastBalances?: number[];
  forecastCashflows?: number[];
  fullFireTarget: number;
  monthlySavings: number;
  monthlySpend: number;
  startBalance: number;
  targetLowerMonthlyIncome: number;
  totalMonths: number;
}): FireProjectionResult {
  const monthlyRate = annualRealReturn / 12;
  const downshiftWithdrawal = getDownshiftMonthlyWithdrawal(
    monthlySpend,
    targetLowerMonthlyIncome,
  );
  const { phase: initialPhase, inflectionType: initialInflectionType } =
    getInitialPhase({
      startBalance,
      downshiftTarget,
      fullFireTarget,
    });

  const points: FireProjectionMonthPoint[] = [];
  let balance = Math.max(0, startBalance);
  let phase: FireProjectionPhase = initialPhase;
  let retirementInflectionType = initialInflectionType;
  let retirementInflectionMonth =
    initialInflectionType !== null ? 0 : null;
  let fullFireReachedMonth =
    fullFireTarget > 0 && startBalance >= fullFireTarget ? 0 : null;

  for (let month = 0; month <= totalMonths; month++) {
    let cashflow = monthlySavings;

    if (
      phase === "accumulation" &&
      month > 0 &&
      month <= forecastCashflows.length
    ) {
      cashflow = forecastCashflows[month - 1];
    } else if (phase === "downshift-retired") {
      cashflow = -downshiftWithdrawal;
    } else if (phase === "full-fire-retired") {
      cashflow = -Math.max(0, monthlySpend);
    }

    points.push({
      month,
      year: month / 12,
      balance: Math.max(0, balance),
      cashflow,
      isForecast: month > 0 && month <= forecastBalances.length && phase === "accumulation",
      phase,
    });

    if (month === totalMonths) break;

    if (month + 1 <= forecastBalances.length && phase === "accumulation") {
      balance = Math.max(0, forecastBalances[month]);
    } else {
      balance = Math.max(0, balance * (1 + monthlyRate) + cashflow);
    }

    if (phase === "accumulation") {
      if (
        downshiftTarget > 0 &&
        downshiftTarget < fullFireTarget &&
        balance >= downshiftTarget
      ) {
        phase = "downshift-retired";
        retirementInflectionType = "downshift";
        retirementInflectionMonth = month + 1;
      } else if (fullFireTarget > 0 && balance >= fullFireTarget) {
        phase = "full-fire-retired";
        retirementInflectionType = "full-fire";
        retirementInflectionMonth = month + 1;
      }
    }

    if (fullFireReachedMonth === null && fullFireTarget > 0 && balance >= fullFireTarget) {
      fullFireReachedMonth = month + 1;
    }

    if (
      phase === "downshift-retired" &&
      fullFireReachedMonth !== null &&
      month + 1 >= fullFireReachedMonth
    ) {
      phase = "full-fire-retired";
    }
  }

  const postRetirementMonthlyWithdrawal =
    retirementInflectionType === "downshift"
      ? downshiftWithdrawal
      : retirementInflectionType === "full-fire"
        ? Math.max(0, monthlySpend)
        : 0;

  return {
    points,
    retirementInflectionMonth,
    retirementInflectionYear:
      retirementInflectionMonth == null ? null : retirementInflectionMonth / 12,
    retirementInflectionType,
    fullFireReachedMonth,
    fullFireReachedYear:
      fullFireReachedMonth == null ? null : fullFireReachedMonth / 12,
    postRetirementMonthlyWithdrawal,
  };
}
