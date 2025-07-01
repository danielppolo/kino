# Currency Conversion Utility

This document describes the currency conversion utility functions that can be used across charts and components to properly handle multi-currency data aggregation.

## Overview

The currency conversion utility provides functions to convert amounts between different currencies and aggregate data across multiple wallets with different currencies into a base currency for consistent visualization.

## Functions

### `convertCurrency(amountCents, fromCurrency, toCurrency, conversionRates)`

Converts an amount from one currency to another using conversion rates.

**Parameters:**
- `amountCents`: Amount in cents
- `fromCurrency`: Source currency code (e.g., 'USD', 'EUR')
- `toCurrency`: Target currency code
- `conversionRates`: Object mapping currency codes to conversion rates

**Returns:** Converted amount in cents

**Example:**
```typescript
const converted = convertCurrency(10000, 'EUR', 'USD', { EUR: { rate: 0.85 } });
// Returns: 8500 (10000 * 0.85)
```

### `convertToBaseCurrency(data, conversionRates, baseCurrency, walletMap)`

Converts an array of data items to a base currency.

**Parameters:**
- `data`: Array of objects with `amount_cents` and `wallet_id` properties
- `conversionRates`: Object mapping currency codes to conversion rates
- `baseCurrency`: Target base currency
- `walletMap`: Map of wallet IDs to wallet objects with currency information

**Returns:** Array with converted amounts

### `aggregateByKeyWithCurrencyConversion(data, keyField, conversionRates, baseCurrency, walletMap)`

Aggregates data by a specific key (like label_id or category_id) while converting all amounts to a base currency.

**Parameters:**
- `data`: Array of objects with `amount_cents`, `wallet_id`, and the key field
- `keyField`: Field name to aggregate by (e.g., 'label_id', 'category_id')
- `conversionRates`: Object mapping currency codes to conversion rates
- `baseCurrency`: Target base currency
- `walletMap`: Map of wallet IDs to wallet objects

**Returns:** Object mapping keys to aggregated totals with metadata

## Usage in Charts

### Label Pie Chart

The label pie chart now uses currency conversion to properly aggregate data across different wallets:

```typescript
import { aggregateByKeyWithCurrencyConversion } from '@/utils/currency-conversion';
import { useCurrency, useWallets } from '@/contexts/settings-context';

const { conversionRates, baseCurrency } = useCurrency();
const [, walletMap] = useWallets();

// Transform data with currency conversion
const transformedData = useMemo(() => {
  const dataWithAmounts = data.map((item) => ({
    ...item,
    amount_cents: type === "income" ? item.income_cents : Math.abs(item.outcome_cents),
    label_id: item.labels?.id,
  }));

  const aggregated = aggregateByKeyWithCurrencyConversion(
    dataWithAmounts,
    "label_id",
    conversionRates,
    baseCurrency,
    walletMap,
  );

  // Transform to pie chart format...
}, [data, conversionRates, baseCurrency, walletMap]);
```

### Category Pie Chart

Similar pattern for category pie charts:

```typescript
const aggregated = aggregateByKeyWithCurrencyConversion(
  dataWithAmounts,
  "category_id",
  conversionRates,
  baseCurrency,
  walletMap,
);
```

### Accumulated Area Chart

For time series data, use `convertToBaseCurrency`:

```typescript
import { convertToBaseCurrency } from '@/utils/currency-conversion';

const convertedBalances = convertToBaseCurrency(
  monthlyBalances.map(balance => ({
    amount_cents: balance.balance_cents,
    wallet_id: balance.wallet_id,
    month: balance.month,
  })),
  conversionRates,
  baseCurrency,
  walletMap,
);
```

## Database Queries

To use currency conversion, ensure your database queries include `wallet_id`:

```typescript
// In queries.ts
export const getLabelPieChartData = async (client, params) => {
  let query = client.from("monthly_label_stats").select(`
    income_cents,
    outcome_cents,
    net_cents,
    transaction_count,
    wallet_id,  // Include this for currency conversion
    labels (
      id,
      name,
      color
    )
  `);
  // ... rest of query
};
```

## Benefits

1. **Consistent Visualization**: All charts show data in the same base currency
2. **Accurate Aggregation**: Properly handles multi-currency data without double-counting
3. **Reusable Logic**: Same utility functions work across all chart types
4. **Type Safety**: TypeScript interfaces ensure correct data structure
5. **Error Handling**: Gracefully handles missing conversion rates or wallet data

## Migration Notes

When migrating existing charts to use currency conversion:

1. Update database queries to include `wallet_id`
2. Import currency conversion utilities
3. Use `useCurrency()` and `useWallets()` hooks
4. Transform data using the utility functions
5. Update display components to use the base currency 