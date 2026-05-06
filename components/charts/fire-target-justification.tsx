"use client";

import { useMemo } from "react";

import { ChartSkeleton } from "@/components/charts/shared/chart-skeleton";
import { useChartControls } from "@/components/charts/shared/chart-controls-context";
import { useFirePlanData } from "@/components/charts/shared/use-fire-plan-data";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/utils/chart-helpers";

interface FireTargetJustificationProps {
  walletId?: string;
  from?: string;
  to?: string;
}

export function FireTargetJustification({
  walletId,
  from,
  to,
}: FireTargetJustificationProps) {
  const controls = useChartControls();
  const {
    baseCurrency,
    contextualAssetValue,
    downshiftFireNumber,
    effectiveMonthlySpend,
    fullFireNumber,
    hasContextualAssets,
    historicalNetMonthlySavings,
    investableBalance,
    isLoading,
    selectedWR,
    targetLowerMonthlyIncome,
  } = useFirePlanData({
    walletId,
    from,
    to,
  });
  const forecastHorizonYears = controls?.forecastHorizonYears ?? 1;

  const hasSeparateDownshiftTarget =
    targetLowerMonthlyIncome > 0 && downshiftFireNumber < fullFireNumber;

  const annualSpend = effectiveMonthlySpend * 12;
  const uncoveredMonthlyGap = Math.max(
    0,
    effectiveMonthlySpend - targetLowerMonthlyIncome,
  );
  const uncoveredAnnualGap = uncoveredMonthlyGap * 12;
  const remainingToFullFire = Math.max(0, fullFireNumber - investableBalance);
  const remainingToDownshift = Math.max(
    0,
    downshiftFireNumber - investableBalance,
  );
  const assetCoverageEquivalentMonths =
    effectiveMonthlySpend > 0
      ? contextualAssetValue / effectiveMonthlySpend
      : 0;
  const coveragePct =
    fullFireNumber > 0 ? (investableBalance / fullFireNumber) * 100 : 0;
  const downshiftCoveragePct =
    downshiftFireNumber > 0
      ? (investableBalance / downshiftFireNumber) * 100
      : 0;

  const headline = useMemo(() => {
    if (hasSeparateDownshiftTarget) {
      return `Your liquid portfolio covers ${downshiftCoveragePct.toFixed(1)}% of the downshift target and ${coveragePct.toFixed(1)}% of the full FIRE target.`;
    }

    return `Downshift and full FIRE are currently the same target because lower-income work is set to ${formatCurrency(targetLowerMonthlyIncome, baseCurrency)}/mo.`;
  }, [
    baseCurrency,
    coveragePct,
    downshiftCoveragePct,
    hasSeparateDownshiftTarget,
    targetLowerMonthlyIncome,
  ]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>FIRE Target Logic</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartSkeleton variant="compact" className="h-24" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>FIRE Target Logic</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-muted-foreground text-sm">{headline}</div>
        <Accordion type="single" collapsible defaultValue="formula">
          <AccordionItem value="formula">
            <AccordionTrigger>How the target is calculated</AccordionTrigger>
            <AccordionContent className="space-y-3">
              <p>
                The product starts from your current monthly spend of{" "}
                <strong>
                  {formatCurrency(effectiveMonthlySpend, baseCurrency)}
                </strong>
                , which implies annual spending of{" "}
                <strong>{formatCurrency(annualSpend, baseCurrency)}</strong>.
              </p>
              <p>
                Full FIRE uses:{" "}
                <strong>
                  annual spend / withdrawal rate ={" "}
                  {formatCurrency(fullFireNumber, baseCurrency)}
                </strong>{" "}
                at a {(selectedWR * 100).toFixed(1)}% withdrawal rate.
              </p>
              <p>
                {hasSeparateDownshiftTarget ? (
                  <>
                    Downshift readiness assumes lower-income work contributes{" "}
                    <strong>
                      {formatCurrency(targetLowerMonthlyIncome, baseCurrency)}
                      /mo
                    </strong>
                    , leaving an uncovered gap of{" "}
                    <strong>
                      {formatCurrency(uncoveredMonthlyGap, baseCurrency)}/mo
                    </strong>
                    . That gap becomes an annual portfolio burden of{" "}
                    <strong>
                      {formatCurrency(uncoveredAnnualGap, baseCurrency)}
                    </strong>
                    , which implies a downshift target of{" "}
                    <strong>
                      {formatCurrency(downshiftFireNumber, baseCurrency)}
                    </strong>
                    .
                  </>
                ) : (
                  <>
                    Lower-income work is currently set to{" "}
                    <strong>
                      {formatCurrency(targetLowerMonthlyIncome, baseCurrency)}
                      /mo
                    </strong>
                    , so there is no separate downshift reduction. That makes
                    the downshift target identical to the full FIRE target.
                  </>
                )}
              </p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="portfolio">
            <AccordionTrigger>What counts and what does not</AccordionTrigger>
            <AccordionContent className="space-y-3">
              <p>
                The chart uses your liquid, investable portfolio only:{" "}
                <strong>
                  {formatCurrency(investableBalance, baseCurrency)}
                </strong>
                .
              </p>
              <p>
                Historical net savings are estimated at{" "}
                <strong>
                  {formatCurrency(historicalNetMonthlySavings, baseCurrency)}/mo
                </strong>
                . That is the recurring contribution used while you are still in
                accumulation mode. If you set a forecast horizon above 0, the
                forecast controls the near-term path for the first{" "}
                <strong>{forecastHorizonYears} year(s)</strong>. If you set it
                to <strong>0y</strong>, the chart skips the forecast entirely
                and projects directly from today.
              </p>
              {hasContextualAssets ? (
                <p>
                  Tracked assets are shown separately as contextual fallback
                  capital:{" "}
                  <strong>
                    {formatCurrency(contextualAssetValue, baseCurrency)}
                  </strong>
                  . They are excluded from the FIRE target because they are
                  illiquid, may take time to sell, may have taxes or transaction
                  costs, and may serve lifestyle or optionality purposes instead
                  of funding annual withdrawals. At your current spend, that
                  asset base is roughly equivalent to{" "}
                  <strong>
                    {assetCoverageEquivalentMonths.toFixed(1)} months
                  </strong>{" "}
                  of expenses, but it is not treated as default retirement
                  capital.
                </p>
              ) : (
                <p>
                  No tracked assets are currently contributing contextual
                  fallback capital. The target is therefore explained entirely
                  by spend, withdrawal rate, investable balance, and savings
                  rate.
                </p>
              )}
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="meaning">
            <AccordionTrigger>How to read the numbers</AccordionTrigger>
            <AccordionContent className="space-y-3">
              <p>
                Full FIRE asks: “How much capital is needed so the portfolio can
                fund the whole lifestyle on its own?”
              </p>
              <p>
                Downshift readiness asks: “How much capital is needed so the
                portfolio only has to fund the gap after lower-income work?”
              </p>
              <p>
                Today, you still need{" "}
                <strong>
                  {formatCurrency(remainingToFullFire, baseCurrency)}
                </strong>{" "}
                to reach full FIRE.
                {hasSeparateDownshiftTarget ? (
                  <>
                    {" "}
                    You need{" "}
                    <strong>
                      {formatCurrency(remainingToDownshift, baseCurrency)}
                    </strong>{" "}
                    to reach the downshift threshold.
                  </>
                ) : (
                  <>
                    {" "}
                    Because the downshift target is the same right now, the two
                    progress meters match.
                  </>
                )}
              </p>
              <p>
                Once the portfolio hits the first qualifying threshold, the FIRE
                projection changes phase. It stops treating monthly cashflow as
                savings and starts treating it as withdrawals to fund spending.
                That inflection point is the model’s estimate of when retirement
                or downshifting becomes possible.
              </p>
              <p>
                The point of this section is not to claim a single “correct”
                retirement number. It is to show exactly which inputs are
                producing the current target so you can decide whether the spend
                assumption, withdrawal rate, or lower-income work assumption is
                the one that should move.
              </p>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}
