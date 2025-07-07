# Monthly Category and Label Stats Implementation

This document describes the implementation of monthly category and label statistics for pie chart visualization in the financial application.

## Overview

We've implemented two new database tables that automatically aggregate transaction data by category and label on a monthly basis:

- `monthly_category_stats` - Aggregates transactions by category and month
- `monthly_label_stats` - Aggregates transactions by label and month

## Database Schema

### monthly_category_stats Table

```sql
CREATE TABLE monthly_category_stats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    wallet_id UUID REFERENCES wallets(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
    month DATE NOT NULL,
    income_cents BIGINT NOT NULL DEFAULT 0,
    outcome_cents BIGINT NOT NULL DEFAULT 0,
    net_cents BIGINT NOT NULL DEFAULT 0,
    transaction_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(wallet_id, category_id, month)
);
```

### monthly_label_stats Table

```sql
CREATE TABLE monthly_label_stats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    wallet_id UUID REFERENCES wallets(id) ON DELETE CASCADE,
    label_id UUID REFERENCES labels(id) ON DELETE CASCADE,
    month DATE NOT NULL,
    income_cents BIGINT NOT NULL DEFAULT 0,
    outcome_cents BIGINT NOT NULL DEFAULT 0,
    net_cents BIGINT NOT NULL DEFAULT 0,
    transaction_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(wallet_id, label_id, month)
);
```

## Automatic Updates

Both tables are automatically updated via database triggers when transactions are inserted, updated, or deleted:

### Triggers for monthly_category_stats

- `update_monthly_category_stats_trigger` - Fires on INSERT/UPDATE of transactions
- `update_monthly_category_stats_on_delete_trigger` - Fires on DELETE of transactions

### Triggers for monthly_label_stats

- `update_monthly_label_stats_trigger` - Fires on INSERT/UPDATE of transactions
- `update_monthly_label_stats_on_delete_trigger` - Fires on DELETE of transactions

## Query Functions

### Category Stats Queries

```typescript
// Get monthly category stats with filtering
const getMonthlyCategoryStats = async (
  client: TypedSupabaseClient,
  params: {
    walletId?: string;
    categoryId?: string;
    from?: string;
    to?: string;
    type?: 'income' | 'expense' | 'net';
  }
);

// Get category pie chart data for a date range
const getCategoryPieChartData = async (
  client: TypedSupabaseClient,
  params: {
    walletId: string;
    from?: string;
    to?: string;
    type: 'income' | 'expense' | 'net';
  }
);
```

### Label Stats Queries

```typescript
// Get monthly label stats with filtering
const getMonthlyLabelStats = async (
  client: TypedSupabaseClient,
  params: {
    walletId?: string;
    labelId?: string;
    from?: string;
    to?: string;
    type?: 'income' | 'expense' | 'net';
  }
);

// Get label pie chart data for a date range
const getLabelPieChartData = async (
  client: TypedSupabaseClient,
  params: {
    walletId: string;
    from?: string;
    to?: string;
    type: 'income' | 'expense' | 'net';
  }
);
```

## React Components

### CategoryPieChart Component

```typescript
<CategoryPieChart
  walletId="your-wallet-id"
  from="2024-01"   // Optional: date range start
  to="2024-12"     // Optional: date range end
  type="expense"
  title="Category Distribution"
/>
```

### LabelPieChart Component

```typescript
<LabelPieChart
  walletId="your-wallet-id"
  from="2024-01"   // Optional: date range start
  to="2024-12"     // Optional: date range end
  type="expense"
  title="Label Distribution"
/>
```

## Usage Examples

### Basic Pie Chart Usage (Date Range)

```typescript
import { getCategoryPieChartData } from "@/utils/supabase/queries";

// Get category data for pie chart (date range)
const { data, error } = await getCategoryPieChartData(supabase, {
  walletId: "your-wallet-id",
  from: "2024-01",
  to: "2024-12",
  type: "expense"
});

// Transform data for chart library
const chartData = data?.map((item, index) => ({
  name: item.categories?.name || 'Unknown',
  value: Math.abs(item.outcome_cents), // Use Math.abs for expenses
  color: COLORS[index % COLORS.length],
  icon: item.categories?.icon
}));
```

### Filtering by Type

```typescript
// Get only income categories
const incomeData = await getCategoryPieChartData(supabase, {
  walletId: "your-wallet-id",
  from: "2024-01",
  to: "2024-12",
  type: "income"
});

// Get only expense categories
const expenseData = await getCategoryPieChartData(supabase, {
  walletId: "your-wallet-id",
  from: "2024-01",
  to: "2024-12",
  type: "expense"
});

// Get net categories (can be positive or negative)
const netData = await getCategoryPieChartData(supabase, {
  walletId: "your-wallet-id",
  from: "2024-01",
  to: "2024-12",
  type: "net"
});
```

## Performance Benefits

1. **Pre-aggregated Data**: No need to calculate sums on-the-fly
2. **Efficient Queries**: Fast lookups with proper indexing
3. **Real-time Updates**: Automatic updates via triggers
4. **Reduced Load**: Less computation on the application layer

## Indexes

The following indexes are created for optimal performance:

```sql
-- monthly_category_stats indexes
CREATE INDEX monthly_category_stats_wallet_month_idx ON monthly_category_stats(wallet_id, month);
CREATE INDEX monthly_category_stats_category_idx ON monthly_category_stats(category_id);
CREATE INDEX monthly_category_stats_wallet_category_idx ON monthly_category_stats(wallet_id, category_id);

-- monthly_label_stats indexes
CREATE INDEX monthly_label_stats_wallet_month_idx ON monthly_label_stats(wallet_id, month);
CREATE INDEX monthly_label_stats_label_idx ON monthly_label_stats(label_id);
CREATE INDEX monthly_label_stats_wallet_label_idx ON monthly_label_stats(wallet_id, label_id);
```

## Migration Files

1. `20250623134251_create_monthly_category_stats.sql` - Creates category stats table and triggers
2. `20250623134255_create_monthly_label_stats.sql` - Creates label stats table and triggers
3. `20250623134503_backfill_monthly_category_label_stats.sql` - Populates tables with existing data

## Scheduled Backfill Job

Monthly stats and balances are normally created when transactions occur. To
ensure wallets without activity still get records for the new month, a cron job
runs on the first day of every month. It calls the `backfill_wallet_monthly_balances`
and `backfill_monthly_stats_with_transfers` functions via the
`/api/cron/monthly-backfill` route. The schedule is defined in `vercel.json` as
`0 0 1 * *`.

## Demo Page

A demo page is available at `/app/charts` that shows how to use the pie chart components with the new data structure.

## Future Enhancements

1. **Time Series Analysis**: Add support for trend analysis over multiple months
2. **Budget Tracking**: Compare actual vs budgeted amounts by category
3. **Export Functionality**: Export aggregated data for external analysis
4. **Advanced Filtering**: Filter by date ranges, multiple wallets, etc.
5. **Caching**: Implement Redis caching for frequently accessed data 