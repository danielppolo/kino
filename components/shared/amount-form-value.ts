export type AmountFormValue = number | "";

export function getAmountFormValue(amount?: number | null): AmountFormValue {
  return amount == null ? "" : amount;
}

export function normalizeAmountFormValue(amount: AmountFormValue): number {
  return amount === "" ? 0 : Number(amount);
}
