import { BrainCircuit } from "lucide-react";

import { Text } from "@/components/ui/typography";
import { cn } from "@/lib/utils";

export function KeyValueTile({
  label,
  value,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string;
  icon: typeof BrainCircuit;
  tone?: "default" | "warning" | "success";
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-3",
        tone === "warning"
          ? "border-amber-200/80 bg-amber-50/80 dark:border-amber-900/40 dark:bg-amber-950/25"
          : tone === "success"
            ? "border-emerald-200/80 bg-emerald-50/80 dark:border-emerald-900/40 dark:bg-emerald-950/25"
            : "border-border/70 bg-background/75",
      )}
    >
      <div className="mb-2 flex items-center gap-2">
        <div
          className={cn(
            "flex size-8 items-center justify-center rounded-xl",
            tone === "warning"
              ? "bg-amber-100 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300"
              : tone === "success"
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300"
                : "bg-primary/10 text-primary",
          )}
        >
          <Icon className="size-4" />
        </div>
        <Text strong className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </Text>
      </div>
      <Text className="text-sm leading-6">{value}</Text>
    </div>
  );
}
