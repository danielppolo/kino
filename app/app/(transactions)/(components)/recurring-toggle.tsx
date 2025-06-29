"use client";

import { Repeat } from "lucide-react";
import {
  useParams,
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";

import { TooltipToggle } from "@/components/ui/tooltip-toggle";

function RecurringToggle() {
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const walletId = params.walletId as string | undefined;

  return (
    <TooltipToggle
      size="sm"
      tooltip="Toggle recurring transactions"
      pressed={pathname.includes("recurrent_transactions")}
      onPressedChange={(pressed) => {
        const currentSearchParams = new URLSearchParams(searchParams);
        const searchParamsString = currentSearchParams.toString();
        const queryString = searchParamsString ? `?${searchParamsString}` : "";

        if (pressed) {
          router.push(
            walletId
              ? `/app/recurrent_transactions/${walletId}${queryString}`
              : `/app/recurrent_transactions${queryString}`,
          );
        } else {
          router.push(
            walletId
              ? `/app/transactions/${walletId}${queryString}`
              : `/app/transactions${queryString}`,
          );
        }
      }}
    >
      <Repeat className="size-4" />
    </TooltipToggle>
  );
}

export default RecurringToggle;
