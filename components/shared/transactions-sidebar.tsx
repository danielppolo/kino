"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { SidebarWrapper } from "./sidebar-wrapper";

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useTotalBalance } from "@/hooks/use-total-balance";
import { formatCents } from "@/utils/format-cents";
import { createClient } from "@/utils/supabase/client";

export function TransactionsSidebar() {
  const pathname = usePathname();
  const { walletsByCurrency } = useTotalBalance();
  const [user, setUser] = useState<{
    name: string;
    email: string;
    avatar: string;
  } | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createClient();
      const {
        data: { user: supabaseUser },
      } = await supabase.auth.getUser();

      if (supabaseUser) {
        setUser({
          name:
            supabaseUser.user_metadata?.full_name ||
            supabaseUser.email?.split("@")[0] ||
            "User",
          email: supabaseUser.email || "",
          avatar: supabaseUser.user_metadata?.avatar_url || "",
        });
      }
    };

    fetchUser();
  }, []);

  return (
    <SidebarWrapper user={user}>
      {Object.entries(walletsByCurrency).map(([currency, currencyWallets]) => (
        <SidebarGroup key={currency}>
          <SidebarGroupLabel className="flex items-center justify-between">
            <span>{currency}</span>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {currencyWallets.map((wallet) => (
                <SidebarMenuItem key={wallet.id}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname.includes(wallet.id)}
                  >
                    <Link href={`/app/transactions/${wallet.id}`}>
                      <span className="flex-1">{wallet.name}</span>
                      <span className="text-muted-foreground text-xs">
                        {formatCents(
                          wallet.balance_cents ?? 0,
                          wallet.currency,
                        )}
                      </span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ))}
    </SidebarWrapper>
  );
}
