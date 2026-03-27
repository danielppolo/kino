import { z } from "zod";

export const ToolScopeSchema = z.object({
  walletId: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

export const GetTransactionsArgsSchema = z.object({
  walletId: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  categoryId: z.string().optional(),
  labelId: z.string().optional(),
  tag: z.string().optional(),
  type: z.enum(["income", "expense", "transfer"]).optional(),
  description: z.string().optional(),
  limit: z.number().int().min(1).max(20).default(8),
});

export const CategoryDrilldownArgsSchema = z.object({
  categoryId: z.string(),
  walletId: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  limit: z.number().int().min(1).max(20).default(8),
});

export const ForecastDetailsArgsSchema = z.object({
  horizonMonths: z.number().int().min(1).max(6).default(6),
  walletId: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

export const BillOverviewArgsSchema = z.object({
  walletId: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});
