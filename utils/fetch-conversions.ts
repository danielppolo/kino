export interface CurrencyConversion {
  rate: number;
  lastUpdated: string;
  source: "cache" | "api" | "direct";
}

export const fetchConversion = async (
  sourceCurrency: string,
  targetCurrency: string,
) => {
  try {
    const response = await fetch(
      `/api/currencies?source=${sourceCurrency}&target=${targetCurrency}`,
    );
    if (!response.ok) {
      throw new Error("Failed to fetch currency conversion");
    }
    const result = await response.json();
    return result as CurrencyConversion;
  } catch (err) {
    throw err;
  }
};
