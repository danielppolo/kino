import { cn } from "@/lib/utils";
import React from "react";

export default function PageHeader({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "bg-background flex h-11 items-center justify-between gap-2 rounded-t-lg px-3",
        className,
      )}
    >
      {children}
    </div>
  );
}
