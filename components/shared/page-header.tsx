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
        "flex h-11 items-center justify-between gap-2 px-3 pl-10",
        className,
      )}
    >
      {children}
    </div>
  );
}
