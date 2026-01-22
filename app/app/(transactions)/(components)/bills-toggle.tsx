"use client";

import { Receipt } from "lucide-react";
import {
  useParams,
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";

import { TooltipToggle } from "@/components/ui/tooltip-toggle";

function BillsToggle() {
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const walletId = params.walletId as string;

  return (
    <TooltipToggle
      size="sm"
      tooltip="Toggle bills view"
      pressed={pathname.includes("/bills")}
      onPressedChange={(pressed) => {
        const currentSearchParams = new URLSearchParams(searchParams);
        const searchParamsString = currentSearchParams.toString();
        const queryString = searchParamsString ? `?${searchParamsString}` : "";

        if (pressed) {
          router.push(
            walletId
              ? `/app/bills/${walletId}${queryString}`
              : `/app/bills${queryString}`,
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
      <Receipt className="size-4" />
    </TooltipToggle>
  );
}

export default BillsToggle;

