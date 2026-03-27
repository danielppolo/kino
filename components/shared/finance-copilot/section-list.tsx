import { BrainCircuit } from "lucide-react";

import { Text } from "@/components/ui/typography";
import { cn } from "@/lib/utils";

export function SectionList({
  title,
  icon: Icon,
  items,
  tone = "default",
}: {
  title: string;
  icon: typeof BrainCircuit;
  items: string[];
  tone?: "default" | "warning";
}) {
  if (items.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div
          className={cn(
            "flex size-7 items-center justify-center rounded-full border",
            tone === "warning"
              ? "border-amber-300/70 bg-amber-100/80 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300"
              : "border-primary/20 bg-primary/10 text-primary",
          )}
        >
          <Icon className="size-3.5" />
        </div>
        <Text strong className="text-xs uppercase text-muted-foreground">
          {title}
        </Text>
      </div>
      <div className="grid gap-2">
        {items.map((item) => (
          <div
            key={item}
            className={cn(
              "rounded-2xl border px-3 py-2.5 text-sm leading-6",
              tone === "warning"
                ? "border-amber-200/80 bg-amber-50/80 text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100"
                : "border-border/70 bg-background/75 text-foreground/90",
            )}
          >
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}
