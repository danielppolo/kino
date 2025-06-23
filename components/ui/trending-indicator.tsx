"use client";

import { format } from "date-fns";
import { TrendingDown, TrendingUp } from "lucide-react";

interface TrendingIndicatorProps {
  percentageChange: number;
  startDate?: string;
  endDate?: string;
  className?: string;
}

export function TrendingIndicator({
  percentageChange,
  startDate,
  endDate,
  className = "",
}: TrendingIndicatorProps) {
  const isPositive = percentageChange > 0;
  const TrendIcon = isPositive ? TrendingUp : TrendingDown;

  return (
    <div className={`flex w-full items-start gap-2 text-sm ${className}`}>
      <div className="grid gap-2">
        <div className="flex items-center gap-2 leading-none font-medium">
          {isPositive ? "Trending up" : "Trending down"} by{" "}
          {Math.abs(percentageChange).toFixed(1)}% this month{" "}
          <TrendIcon className="h-4 w-4" />
        </div>
        {(startDate || endDate) && (
          <div className="text-muted-foreground flex items-center gap-2 leading-none">
            {startDate && endDate ? (
              <>
                {format(new Date(startDate), "MMMM yyyy")} -{" "}
                {format(new Date(endDate), "MMMM yyyy")}
              </>
            ) : startDate ? (
              format(new Date(startDate), "MMMM yyyy")
            ) : endDate ? (
              format(new Date(endDate), "MMMM yyyy")
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
