"use client";

import { ChartArea } from "lucide-react";
import { useParams, usePathname, useRouter } from "next/navigation";

import { Toggle } from "@/components/ui/toggle";

function ChartToggle() {
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname();
  const walletId = params.walletId as string;

  return (
    <Toggle
      size="sm"
      pressed={pathname.includes("infographics")}
      onPressedChange={(pressed) => {
        if (pressed) {
          router.push(`/app/infographics/${walletId}`);
        } else {
          router.push(`/app/transactions/${walletId}`);
        }
      }}
    >
      <ChartArea className="size-4" />
    </Toggle>
  );
}

export default ChartToggle;
