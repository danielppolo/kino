import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type ChartSkeletonVariant =
  | "area"
  | "bar"
  | "compact"
  | "flow"
  | "gauge"
  | "heatmap"
  | "pie"
  | "scatter";

interface ChartSkeletonProps {
  className?: string;
  variant?: ChartSkeletonVariant;
}

const barHeights = ["42%", "68%", "54%", "82%", "48%", "74%", "60%"];
const heatmapCells = Array.from({ length: 35 }, (_, index) => index);
const scatterPoints = [
  ["18%", "62%"],
  ["27%", "44%"],
  ["36%", "71%"],
  ["45%", "35%"],
  ["56%", "55%"],
  ["68%", "30%"],
  ["78%", "66%"],
  ["86%", "47%"],
];

export function ChartSkeleton({
  className,
  variant = "area",
}: ChartSkeletonProps) {
  return (
    <div
      aria-label="Loading chart"
      className={cn("h-64 w-full animate-pulse", className)}
      role="status"
    >
      <span className="sr-only">Loading chart</span>
      {variant === "bar" && <BarSkeleton />}
      {variant === "compact" && <CompactSkeleton />}
      {variant === "flow" && <FlowSkeleton />}
      {variant === "gauge" && <GaugeSkeleton />}
      {variant === "heatmap" && <HeatmapSkeleton />}
      {variant === "pie" && <PieSkeleton />}
      {variant === "scatter" && <ScatterSkeleton />}
      {variant === "area" && <AreaSkeleton />}
    </div>
  );
}

function ChartFrame({ children }: { children: ReactNode }) {
  return (
    <div className="border-border/70 bg-muted/20 relative h-full overflow-hidden rounded-md border px-4 pt-4 pb-5">
      <div className="absolute inset-x-4 top-4 bottom-5 grid grid-rows-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="border-border/60 border-t" />
        ))}
      </div>
      <div className="relative h-full">{children}</div>
    </div>
  );
}

function AreaSkeleton() {
  return (
    <ChartFrame>
      <svg
        aria-hidden="true"
        className="text-muted-foreground/35 absolute inset-0 h-full w-full"
        preserveAspectRatio="none"
        viewBox="0 0 100 100"
      >
        <path
          d="M2 72 C16 66 22 43 35 52 C47 62 52 28 66 38 C78 48 82 24 98 30"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="3"
        />
        <path
          d="M2 82 C17 78 25 58 38 64 C50 70 58 48 70 56 C82 64 88 44 98 48"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeOpacity="0.55"
          strokeWidth="3"
        />
      </svg>
      <div className="absolute right-0 bottom-0 left-0 flex items-end gap-2">
        {barHeights.map((height, index) => (
          <div
            key={index}
            className="bg-muted-foreground/10 min-h-4 flex-1 rounded-t"
            style={{ height }}
          />
        ))}
      </div>
    </ChartFrame>
  );
}

function BarSkeleton() {
  return (
    <ChartFrame>
      <div className="absolute inset-x-2 top-5 bottom-0 flex items-end gap-3">
        {barHeights.map((height, index) => (
          <div key={index} className="flex flex-1 items-end gap-1">
            <div
              className="bg-muted-foreground/20 flex-1 rounded-t"
              style={{ height }}
            />
            <div
              className="bg-muted-foreground/10 flex-1 rounded-t"
              style={{ height: `${Math.max(parseInt(height, 10) - 18, 20)}%` }}
            />
          </div>
        ))}
      </div>
    </ChartFrame>
  );
}

function PieSkeleton() {
  return (
    <div className="border-border/70 bg-muted/20 flex h-full items-center justify-center gap-8 rounded-md border p-5">
      <div className="border-muted-foreground/20 bg-muted-foreground/10 h-36 w-36 rounded-full border-[28px]" />
      <div className="hidden w-32 space-y-3 sm:block">
        {["w-28", "w-24", "w-32", "w-20"].map((width) => (
          <div key={width} className="flex items-center gap-2">
            <div className="bg-muted-foreground/20 h-3 w-3 rounded-full" />
            <div className={cn("bg-muted-foreground/15 h-3 rounded", width)} />
          </div>
        ))}
      </div>
    </div>
  );
}

function HeatmapSkeleton() {
  return (
    <div className="border-border/70 bg-muted/20 grid h-full grid-cols-7 gap-2 rounded-md border p-4">
      {heatmapCells.map((cell) => (
        <div
          key={cell}
          className={cn(
            "rounded-sm",
            cell % 5 === 0
              ? "bg-muted-foreground/25"
              : cell % 3 === 0
                ? "bg-muted-foreground/15"
                : "bg-muted-foreground/10",
          )}
        />
      ))}
    </div>
  );
}

function ScatterSkeleton() {
  return (
    <ChartFrame>
      {scatterPoints.map(([left, top], index) => (
        <div
          key={`${left}-${top}`}
          className={cn(
            "bg-muted-foreground/20 absolute rounded-full",
            index % 3 === 0 ? "h-5 w-5" : "h-3.5 w-3.5",
          )}
          style={{ left, top }}
        />
      ))}
    </ChartFrame>
  );
}

function GaugeSkeleton() {
  return (
    <div className="border-border/70 bg-muted/20 relative flex h-full items-end justify-center overflow-hidden rounded-md border p-6">
      <div className="border-muted-foreground/20 h-24 w-48 rounded-t-full border-[22px] border-b-0 sm:h-36 sm:w-72 sm:border-[26px]" />
      <div className="bg-muted-foreground/25 absolute bottom-10 h-2 w-20 origin-left rotate-[-18deg] rounded-full sm:w-24" />
      <div className="bg-muted-foreground/20 absolute bottom-8 h-8 w-8 rounded-full" />
    </div>
  );
}

function FlowSkeleton() {
  return (
    <div className="border-border/70 bg-muted/20 flex h-full items-center justify-between rounded-md border p-4 sm:p-5">
      <div className="space-y-3">
        <div className="bg-muted-foreground/15 h-10 w-16 rounded-md sm:w-24" />
        <div className="bg-muted-foreground/10 h-10 w-14 rounded-md sm:w-20" />
      </div>
      <div className="bg-muted-foreground/20 h-3 flex-1 rounded-full" />
      <div className="bg-muted-foreground/15 h-24 w-20 rounded-md sm:w-32" />
      <div className="bg-muted-foreground/20 h-3 flex-1 rounded-full" />
      <div className="space-y-3">
        <div className="bg-muted-foreground/15 h-10 w-16 rounded-md sm:w-24" />
        <div className="bg-muted-foreground/10 h-10 w-14 rounded-md sm:w-20" />
      </div>
    </div>
  );
}

function CompactSkeleton() {
  return (
    <div className="border-border/70 bg-muted/20 flex h-full items-center gap-4 rounded-md border p-4">
      <div className="bg-muted-foreground/15 h-14 w-14 rounded-full" />
      <div className="flex-1 space-y-3">
        <div className="bg-muted-foreground/15 h-4 w-2/3 rounded" />
        <div className="bg-muted-foreground/10 h-3 w-full rounded" />
        <div className="bg-muted-foreground/10 h-3 w-4/5 rounded" />
      </div>
    </div>
  );
}
