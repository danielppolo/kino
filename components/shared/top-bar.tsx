"use client";

import { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface TopBarProps {
  children?: ReactNode;
  className?: string;
}

const TopBar = ({ children, className }: TopBarProps) => {
  return (
    <div className={cn("sticky top-0 z-50 w-full", className)}>
      <div className="flex h-14 items-center">{children}</div>
    </div>
  );
};

export default TopBar;
