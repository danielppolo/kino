import { describe, expect, it } from "vitest";

import {
  computeDownshiftTarget,
  computeFireTarget,
  computeMonthsToTarget,
  projectMonthlyBalances,
  simulateFireProjection,
} from "@/utils/fire-plan";

describe("fire plan math", () => {
  it("computes full FIRE and downshift targets", () => {
    expect(computeFireTarget(5000, 0.04)).toBe(1500000);
    expect(computeDownshiftTarget(5000, 2000, 0.04)).toBe(900000);
    expect(computeDownshiftTarget(5000, 6000, 0.04)).toBe(0);
  });

  it("computes months to target with an existing balance", () => {
    const months = computeMonthsToTarget({
      currentBalance: 250000,
      targetBalance: 500000,
      monthlyContribution: 3000,
      annualRealReturn: 0.04,
    });

    expect(months).not.toBeNull();
    expect(months).toBeLessThanOrEqual(60);
  });

  it("returns null when savings are non-positive and the target is still ahead", () => {
    expect(
      computeMonthsToTarget({
        currentBalance: 100000,
        targetBalance: 300000,
        monthlyContribution: -500,
        annualRealReturn: 0,
      }),
    ).toBeNull();
  });

  it("returns zero months when the target is already reached", () => {
    expect(
      computeMonthsToTarget({
        currentBalance: 400000,
        targetBalance: 300000,
        monthlyContribution: 0,
        annualRealReturn: 0.04,
      }),
    ).toBe(0);
  });

  it("projects balances without double-counting the contribution stream", () => {
    const balances = projectMonthlyBalances({
      startBalance: 100000,
      monthlyContribution: 2000,
      annualRealReturn: 0.06,
      months: 2,
    });

    expect(balances[0]).toBe(100000);
    expect(balances[1]).toBeCloseTo(102500, 5);
    expect(balances[2]).toBeCloseTo(105012.5, 4);
  });

  it("switches from accumulation to downshift withdrawals at the inflection point", () => {
    const result = simulateFireProjection({
      annualRealReturn: 0,
      downshiftTarget: 120000,
      fullFireTarget: 240000,
      monthlySavings: 10000,
      monthlySpend: 6000,
      startBalance: 100000,
      targetLowerMonthlyIncome: 3000,
      totalMonths: 6,
    });

    expect(result.retirementInflectionType).toBe("downshift");
    expect(result.retirementInflectionMonth).toBe(2);
    expect(result.postRetirementMonthlyWithdrawal).toBe(3000);
    expect(result.points[1].cashflow).toBe(10000);
    expect(result.points[2].phase).toBe("downshift-retired");
    expect(result.points[2].cashflow).toBe(-3000);
  });

  it("upgrades from downshift to full-fire withdrawals after the full target is reached", () => {
    const result = simulateFireProjection({
      annualRealReturn: 0,
      downshiftTarget: 120000,
      fullFireTarget: 117000,
      monthlySavings: 10000,
      monthlySpend: 6000,
      startBalance: 100000,
      targetLowerMonthlyIncome: 3000,
      totalMonths: 6,
    });

    expect(result.fullFireReachedMonth).toBe(2);
    expect(result.points[2].phase).toBe("full-fire-retired");
    expect(result.points[2].cashflow).toBe(-6000);
  });

  it("supports 0y forecast mode by projecting directly from today", () => {
    const result = simulateFireProjection({
      annualRealReturn: 0,
      downshiftTarget: 0,
      forecastBalances: [],
      fullFireTarget: 200000,
      monthlySavings: 5000,
      monthlySpend: 4000,
      startBalance: 150000,
      targetLowerMonthlyIncome: 0,
      totalMonths: 2,
    });

    expect(result.points[0].isForecast).toBe(false);
    expect(result.points[1].balance).toBe(155000);
    expect(result.retirementInflectionMonth).toBeNull();
  });

  it("uses forecast-implied cashflow during the forecast phase", () => {
    const result = simulateFireProjection({
      annualRealReturn: 0,
      downshiftTarget: 999999999,
      forecastBalances: [110000, 125000],
      forecastCashflows: [10000, 15000],
      fullFireTarget: 999999999,
      monthlySavings: 5000,
      monthlySpend: 4000,
      startBalance: 100000,
      targetLowerMonthlyIncome: 0,
      totalMonths: 2,
    });

    expect(result.points[1].cashflow).toBe(10000);
    expect(result.points[2].cashflow).toBe(15000);
  });
});
