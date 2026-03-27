import { AlertCircle } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Text } from "@/components/ui/typography";
import EmptyState from "@/components/shared/empty-state";

export function RiskStack({
  title,
  items,
  emptyText,
}: {
  title?: string;
  items: string[];
  emptyText?: string;
}) {
  return (
    <div className="space-y-3">
      {title ? (
        <Text strong className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
          {title}
        </Text>
      ) : null}
      {items.length > 0 ? (
        <div className="space-y-2">
          {items.map((item) => (
            <Alert key={item} className="border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-100">
              <AlertCircle className="size-4 text-amber-600 dark:text-amber-400" />
              <AlertDescription className="text-amber-950 dark:text-amber-100">
                {item}
              </AlertDescription>
            </Alert>
          ))}
        </div>
      ) : emptyText ? (
        <EmptyState title="No Watch-outs" description={emptyText} variant="compact" />
      ) : null}
    </div>
  );
}
