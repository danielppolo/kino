import { BrainCircuit } from "lucide-react";

import { Text } from "@/components/ui/typography";
import { cn } from "@/lib/utils";

export function InsightSurface({
  eyebrow,
  title,
  icon: Icon,
  className,
  children,
  badge,
}: {
  eyebrow?: string;
  title: string;
  icon: typeof BrainCircuit;
  className?: string;
  children: React.ReactNode;
  badge?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-[24px] border shadow-sm",
        className,
      )}
    >
      <div className="border-b px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl border border-current/10 bg-background/80">
              <Icon className="size-4" />
            </div>
            <div className="min-w-0 space-y-0.5">
              {eyebrow ? (
                <Text strong className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  {eyebrow}
                </Text>
              ) : null}
              <Text strong className="text-sm">
                {title}
              </Text>
            </div>
          </div>
          {badge}
        </div>
      </div>
      <div className="px-4 py-4">{children}</div>
    </div>
  );
}
