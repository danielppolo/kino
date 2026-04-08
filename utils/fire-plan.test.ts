import { describe, expect, it } from "vitest";

import {
  computeDownshiftTarget,
  computeFireTarget,
  computeMonthsToTarget,
  projectMonthlyBalances,
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
});
