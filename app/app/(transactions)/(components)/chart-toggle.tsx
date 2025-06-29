"use client";

import { ChartArea } from "lucide-react";
import {
  useParams,
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";

import { TooltipToggle } from "@/components/ui/tooltip-toggle";

function ChartToggle() {
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const walletId = params.walletId as string;

  return (
    <TooltipToggle
      size="sm"
      tooltip="Toggle charts view"
      pressed={pathname.includes("infographics")}
      onPressedChange={(pressed) => {
        const currentSearchParams = new URLSearchParams(searchParams);
        const searchParamsString = currentSearchParams.toString();
        const queryString = searchParamsString ? `?${searchParamsString}` : "";

        if (pressed) {
          router.push(
            walletId
              ? `/app/infographics/${walletId}${queryString}`
              : `/app/infographics${queryString}`,
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
      <ChartArea className="size-4" />
    </TooltipToggle>
  );
}

export default ChartToggle;
