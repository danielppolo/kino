import clsx from "clsx";

import { cn } from "@/utils/cn";

interface ColorProps {
  color?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export default function Color({ color, size = "md", className }: ColorProps) {
  return (
    <div
      className={cn(
        clsx("rounded-sm", {
          "h-3 w-3": size === "sm",
          "h-5 w-5": size === "md",
          "h-8 w-8": size === "lg",
          "border-muted-foreground/60 border border-dashed bg-transparent":
            !color,
        }),
        className,
      )}
      style={color ? { backgroundColor: color } : undefined}
    />
  );
}
