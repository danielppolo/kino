import clsx from "clsx";

import { cn } from "@/utils/cn";

interface ColorProps {
  color: string;
  size?: "sm" | "md" | "lg";
}

export default function Color({ color, size = "md" }: ColorProps) {
  return (
    <div
      className={cn(
        clsx("rounded-sm", {
          "h-3 w-3": size === "sm",
          "h-5 w-5": size === "md",
          "h-8 w-8": size === "lg",
        }),
      )}
      style={{ backgroundColor: color }}
    />
  );
}
