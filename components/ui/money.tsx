import React from "react";
import { Text } from "./typography";
import { formatCents } from "@/utils/format-cents";
import { useSettings } from "@/contexts/settings-context";

interface MoneyProps {
  cents: number;
  currency?: string;
  className?: string;
  destructive?: boolean;
  muted?: boolean;
  strong?: boolean;
  small?: boolean;
  as?: "span";
}

export function Money({
  cents,
  currency = "USD",
  className,
  destructive,
  muted,
  strong,
  small,
  as,
  ...props
}: MoneyProps) {
  const { moneyVisible } = useSettings();

  const displayValue = moneyVisible ? formatCents(cents, currency) : "••••••";

  return (
    <Text
      as={as}
      destructive={destructive}
      muted={muted}
      strong={strong}
      small={small}
      className={className}
      {...props}
    >
      {displayValue}
    </Text>
  );
}
