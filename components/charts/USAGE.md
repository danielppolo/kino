# TrendsChart - Abstracted Chart Component

## Overview

The `TrendsChart` component is a unified, reusable component that handles both category and label trend visualization. It abstracts away data fetching, transformation, and rendering into a single, easy-to-use interface.

## Architecture

### Components

1. **`TrendsChart`** (`components/charts/trends-chart.tsx`)
   - Wrapper component that handles data fetching and business logic
   - Accepts `variant` prop to switch between categories and labels
   - Manages currency conversion, data aggregation, and state

2. **`StackedTrendsChart`** (`components/charts/shared/stacked-trends-chart.tsx`)
   - Pure presentation component
   - Receives normalized data and renders the chart
   - Handles UI states (loading, error, empty)
   - Manages stack mode toggle (percentage/absolute)

3. **`StackOffsetToggle`** (`components/charts/shared/stack-offset-toggle.tsx`)
   - Reusable toggle for switching between percentage and absolute views

## Usage

### Basic Usage - Categories

```tsx
import { TrendsChart } from "@/components/charts/trends-chart";

<TrendsChart
  variant="categories"
  type="expense"
/>
```

### Basic Usage - Labels

```tsx
import { TrendsChart } from "@/components/charts/trends-chart";

<TrendsChart
  variant="labels"
  type="expense"
/>
```

### With Filters

```tsx
<TrendsChart
  variant="categories"
  type="income"
  walletId="wallet-id"
  from="2024-01-01"
  to="2024-12-31"
  title="Custom Title"
/>
```

## Props

| Prop       | Type                             | Required | Description                                    |
| ---------- | -------------------------------- | -------- | ---------------------------------------------- |
| `variant`  | `"labels" \| "categories"`       | Yes      | Determines data source and visualization style |
| `type`     | `"income" \| "expense" \| "net"` | Yes      | Transaction type to display                    |
| `walletId` | `string`                         | No       | Filter by specific wallet                      |
| `from`     | `string`                         | No       | Start date (YYYY-MM-DD)                        |
| `to`       | `string`                         | No       | End date (YYYY-MM-DD)                          |
| `title`    | `string`                         | No       | Custom chart title                             |

## Key Differences Between Variants

### Categories
- Uses `getCategoryTrends` query
- Shows top 10 categories
- Applies outlier normalization (99.7th percentile capping)
- Uses predefined color palette
- Renders as Bar chart
- Simple footer with TrendingIndicator only
- Supports: `income` and `expense` types

### Labels
- Uses `getMonthlyLabelStats` query
- Shows all labels
- Applies outlier normalization (99.7th percentile capping)
- Uses colors from database
- Renders as Area chart
- Rich footer with:
  - TrendingIndicator
  - Total and label count
  - Accordion with detailed breakdown
  - Date range information
- Supports: `income`, `expense`, and `net` types

## Features

### Shared Features
- Currency conversion across wallets
- Outlier normalization (99.7th percentile capping)
- Outlier warning in tooltips (shows capped vs actual values)
- Responsive design
- Loading and error states
- Empty state handling
- Stack mode toggle (percentage/absolute)
- Interactive tooltips with sorted values
- Legend with color indicators
- Trending indicator with percentage change

### Category-Specific Features
- Top 10 filtering
- Predefined color scheme
- Bar chart visualization

### Label-Specific Features
- Clickable label totals (links to transactions)
- All labels displayed
- Database-driven colors
- Comprehensive footer with aggregated data
- Area chart visualization

## Migration Guide

### From CategoryTrendsChart

**Before:**
```tsx
import { CategoryTrendsChart } from "@/components/charts/category-trends-chart";

<CategoryTrendsChart
  type="expense"
  walletId={walletId}
  from={from}
  to={to}
/>
```

**After:**
```tsx
import { TrendsChart } from "@/components/charts/trends-chart";

<TrendsChart
  variant="categories"
  type="expense"
  walletId={walletId}
  from={from}
  to={to}
/>
```

### From LabelAreaChart

```tsx
import { TrendsChart } from "@/components/charts/trends-chart";

<TrendsChart
  variant="labels"
  type="expense"
  walletId={walletId}
  from={from}
  to={to}
  title="Label Trends"
/>
```

## Benefits of Abstraction

1. **Reduced Code Duplication**: Shared chart rendering logic
2. **Consistent UI**: Both variants follow the same patterns
3. **Easier Maintenance**: Update once, affects all chart types
4. **Type Safety**: Single interface for both variants
5. **Flexibility**: Easy to add new variants in the future
6. **Testability**: Separation of data fetching and presentation

## File Structure

```
components/charts/
├── trends-chart.tsx                 # Main wrapper component
├── shared/
│   ├── stack-offset-toggle.tsx     # Toggle component
│   └── stacked-trends-chart.tsx    # Base chart component
├── category-trends-chart.tsx       # Legacy (can be deprecated)
└── label-area-chart.tsx            # Legacy (can be deprecated)
```

## Notes

- The original `CategoryTrendsChart` and `LabelAreaChart` components remain unchanged for backward compatibility
- New code should use `TrendsChart` for consistency
- The abstraction maintains all existing functionality of both chart types
