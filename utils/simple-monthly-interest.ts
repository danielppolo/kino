interface InterestPayment {
  amountCents: number;
  date: string;
}

interface SimpleMonthlyInterestInput {
  annualRatePercent: number;
  asOfDate: string;
  dueDate: string;
  payments: InterestPayment[];
  principalCents: number;
}

function parseDateParts(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return { day, month, year };
}

function toUtcDate(value: string) {
  const { day, month, year } = parseDateParts(value);
  return new Date(Date.UTC(year, month - 1, day));
}

/**
 * Previews simple interest at each calendar-month boundary after the due month.
 * Payments reduce principal; previously accrued interest is never capitalized.
 */
export function calculateSimpleMonthlyInterestCents({
  annualRatePercent,
  asOfDate,
  dueDate,
  payments,
  principalCents,
}: SimpleMonthlyInterestInput): number {
  if (annualRatePercent <= 0 || principalCents <= 0) return 0;

  const asOf = toUtcDate(asOfDate);
  const due = parseDateParts(dueDate);
  const chargeDate = new Date(Date.UTC(due.year, due.month, 1));
  if (chargeDate > asOf) return 0;

  const sortedPayments = payments
    .map((payment) => ({
      ...payment,
      dateValue: toUtcDate(payment.date).getTime(),
    }))
    .sort((a, b) => a.dateValue - b.dateValue);

  const monthlyRate = annualRatePercent / 12 / 100;
  let interestCents = 0;
  let paymentIndex = 0;
  let unpaidPrincipalCents = principalCents;

  while (chargeDate <= asOf && unpaidPrincipalCents > 0) {
    while (
      paymentIndex < sortedPayments.length &&
      sortedPayments[paymentIndex].dateValue < chargeDate.getTime()
    ) {
      unpaidPrincipalCents = Math.max(
        0,
        unpaidPrincipalCents -
          Math.abs(sortedPayments[paymentIndex].amountCents),
      );
      paymentIndex += 1;
    }

    interestCents += Math.round(unpaidPrincipalCents * monthlyRate);
    chargeDate.setUTCMonth(chargeDate.getUTCMonth() + 1);
  }

  return interestCents;
}
