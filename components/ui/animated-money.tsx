"use client";

import NumberFlow from "@number-flow/react";

import { Text } from "@/components/ui/typography";
import { useSettings } from "@/contexts/settings-context";
import { useSessionBalanceAnimation } from "@/hooks/use-session-balance-animation";
import { cn } from "@/lib/utils";

interface AnimatedMoneyProps {
  balanceKey: string;
  cents: number;
  currency?: string;
  className?: string;
  as?: "span";
  ready?: boolean;
}

export function AnimatedMoney({
  balanceKey,
  cents,
  currency = "USD",
  className,
  as,
  ready = true,
}: AnimatedMoneyProps) {
  const { moneyVisible } = useSettings();
  const { displayCents, animated, onAnimationsFinish } =
    useSessionBalanceAnimation(balanceKey, cents, ready);

  if (!moneyVisible) {
    return (
      <Text as={as} className={className}>
        ••••••
      </Text>
    );
  }

  return (
    <Text as={as} className={cn("tabular-nums", className)}>
      <NumberFlow
        value={displayCents / 100}
        animated={animated}
        isolate
        format={{
          style: "currency",
          currency,
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
          currencyDisplay: "symbol",
        }}
        onAnimationsFinish={onAnimationsFinish}
      />
    </Text>
  );
}
