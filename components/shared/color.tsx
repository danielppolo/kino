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
        clsx("rounded-full", {
          "w-2.5 h-2.5": size === "sm",
          "w-5 h-5": size === "md",
          "w-8 h-8": size === "lg",
        }),
      )}
      style={{ backgroundColor: color }}
    />
  );
}
