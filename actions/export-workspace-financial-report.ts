"use server";

import { buildWorkspaceFinancialReport } from "@/utils/workspace-financial-report";
import { buildWorkspaceFinancialReportExports } from "@/utils/workspace-financial-report-format";
import type { WorkspaceFinancialReportFilters } from "@/utils/workspace-financial-report-types";

export async function exportWorkspaceFinancialReport(
  filters: WorkspaceFinancialReportFilters,
) {
  const report = await buildWorkspaceFinancialReport(filters);

  return buildWorkspaceFinancialReportExports(report);
}
