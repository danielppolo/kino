"use client";

import { useState, useTransition } from "react";
import { ChevronDown, Download } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { exportWorkspaceFinancialReport } from "@/actions/export-workspace-financial-report";
import PageHeader from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";

function downloadTextFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

interface WorkspaceFinancialReportControlsProps {
  workspaceId: string;
  workspaceName: string;
  initialFrom?: string;
  initialTo?: string;
}

function useWorkspaceFinancialReportControls({
  workspaceId,
  initialFrom,
  initialTo,
}: WorkspaceFinancialReportControlsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [from, setFrom] = useState(initialFrom ?? "");
  const [to, setTo] = useState(initialTo ?? "");
  const [isRouting, startRoutingTransition] = useTransition();
  const [isDownloadingMarkdown, startMarkdownTransition] = useTransition();
  const [isDownloadingCsv, startCsvTransition] = useTransition();

  const applyFilters = () => {
    const nextParams = new URLSearchParams(searchParams.toString());

    if (from) {
      nextParams.set("from", from);
    } else {
      nextParams.delete("from");
    }

    if (to) {
      nextParams.set("to", to);
    } else {
      nextParams.delete("to");
    }

    startRoutingTransition(() => {
      const query = nextParams.toString();
      router.replace(
        query ? `/app/settings/reports?${query}` : "/app/settings/reports",
      );
    });
  };

  const resetFilters = () => {
    setFrom("");
    setTo("");

    startRoutingTransition(() => {
      router.replace("/app/settings/reports");
    });
  };

  const handleMarkdownDownload = () => {
    startMarkdownTransition(async () => {
      try {
        const result = await exportWorkspaceFinancialReport({
          workspaceId,
          from: from || undefined,
          to: to || undefined,
        });

        downloadTextFile(
          result.markdown.content,
          result.markdown.filename,
          "text/markdown;charset=utf-8;",
        );
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to export Markdown report",
        );
      }
    });
  };

  const handleCsvDownload = () => {
    startCsvTransition(async () => {
      try {
        const result = await exportWorkspaceFinancialReport({
          workspaceId,
          from: from || undefined,
          to: to || undefined,
        });

        result.csvFiles.forEach((file, index) => {
          window.setTimeout(() => {
            downloadTextFile(
              file.content,
              file.filename,
              "text/csv;charset=utf-8;",
            );
          }, index * 150);
        });
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to export CSV files",
        );
      }
    });
  };

  return {
    from,
    to,
    setFrom,
    setTo,
    applyFilters,
    resetFilters,
    handleMarkdownDownload,
    handleCsvDownload,
    isBusy: isRouting || isDownloadingMarkdown || isDownloadingCsv,
  };
}

export function WorkspaceFinancialReportToolbar({
  workspaceId,
  workspaceName,
  initialFrom,
  initialTo,
}: WorkspaceFinancialReportControlsProps) {
  const {
    from,
    to,
    setFrom,
    setTo,
    applyFilters,
    resetFilters,
    handleMarkdownDownload,
    handleCsvDownload,
    isBusy,
  } = useWorkspaceFinancialReportControls({
    workspaceName,
    workspaceId,
    initialFrom,
    initialTo,
  });

  return (
    <PageHeader>
      <div></div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" disabled={isBusy} variant="secondary">
            Export
            <ChevronDown className="ml-2 size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72">
          <DropdownMenuLabel>Report Controls</DropdownMenuLabel>
          <div
            className="grid gap-3 px-2 py-2"
            onClick={(event) => event.stopPropagation()}
          >
            <label className="grid gap-1 text-sm">
              <span className="text-muted-foreground">From</span>
              <Input
                type="date"
                value={from}
                onChange={(event) => setFrom(event.target.value)}
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-muted-foreground">To</span>
              <Input
                type="date"
                value={to}
                onChange={(event) => setTo(event.target.value)}
              />
            </label>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={applyFilters} disabled={isBusy}>
            Apply dates
          </DropdownMenuItem>
          <DropdownMenuItem onClick={resetFilters} disabled={isBusy}>
            Reset dates
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleMarkdownDownload} disabled={isBusy}>
            <Download className="mr-2 size-4" />
            Download Markdown
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleCsvDownload} disabled={isBusy}>
            <Download className="mr-2 size-4" />
            Download CSV package
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </PageHeader>
  );
}
