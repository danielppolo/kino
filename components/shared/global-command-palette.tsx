"use client";

import { useEffect, useMemo, useState } from "react";
import { endOfMonth, format, startOfMonth } from "date-fns";
import {
  ArrowRightLeft,
  Building2,
  ChartArea,
  CreditCard,
  Eye,
  EyeOff,
  FileClock,
  FilePlus,
  FileText,
  Folder,
  HandCoins,
  Hash,
  Bookmark,
  Landmark,
  Monitor,
  Moon,
  Plus,
  Receipt,
  Repeat,
  Settings,
  Sun,
} from "lucide-react";
import { useTheme } from "next-themes";
import {
  useParams,
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  WalletTypeIcon,
  getWalletTypeLabel,
} from "@/components/shared/wallet-type-icon";
import { useSettings, useWallets } from "@/contexts/settings-context";
import { useTransactionForm } from "@/contexts/transaction-form-context";
import { useWorkspace } from "@/contexts/workspace-context";
import { useTransactionQueryState } from "@/hooks/use-transaction-query";
import { buildTransactionUrl } from "@/utils/build-transaction-url";

export function GlobalCommandPalette() {
  const [open, setOpen] = useState(false);
  const { walletId } = useParams<{ walletId?: string }>();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  const { theme, setTheme } = useTheme();
  const [wallets] = useWallets();
  const {
    moneyVisible,
    toggleMoneyVisibility,
    showOwedInBalance,
    toggleShowOwedInBalance,
    featureFlags,
  } = useSettings();
  const { workspaces, activeWorkspace, switchWorkspace } = useWorkspace();
  const { openForm, open: transactionFormOpen } = useTransactionForm();
  const [filters] = useTransactionQueryState();

  const now = useMemo(() => new Date(), []);
  const fromDate = filters.from || format(startOfMonth(now), "yyyy-MM-dd");
  const toDate = filters.to || format(endOfMonth(now), "yyyy-MM-dd");

  const closeAndRun = (callback: () => void | Promise<void>) => {
    setOpen(false);
    callback();
  };

  const getNextTheme = () => {
    return theme === "light" ? "dark" : theme === "dark" ? "system" : "light";
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== "k" || !event.metaKey || event.ctrlKey) {
        return;
      }

      event.preventDefault();
      setOpen((prev) => !prev);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (transactionFormOpen) {
      setOpen(false);
    }
  }, [transactionFormOpen]);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search wallets, workspaces, and actions..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Actions">
          <CommandItem
            value="Create expense transaction"
            onSelect={() =>
              closeAndRun(() => {
                openForm({ type: "expense", walletId });
              })
            }
            disabled={!walletId}
          >
            <Plus className="mr-2 size-4" />
            Create expense transaction
          </CommandItem>
          <CommandItem
            value="Create income transaction"
            onSelect={() =>
              closeAndRun(() => {
                openForm({ type: "income", walletId });
              })
            }
            disabled={!walletId}
          >
            <Landmark className="mr-2 size-4" />
            Create income transaction
          </CommandItem>
          <CommandItem
            value="Create transfer"
            onSelect={() =>
              closeAndRun(() => {
                openForm({ type: "transfer", walletId });
              })
            }
            disabled={!walletId}
          >
            <ArrowRightLeft className="mr-2 size-4" />
            Create transfer
          </CommandItem>

          <CommandItem
            value="Toggle appearance"
            onSelect={() => closeAndRun(() => setTheme(getNextTheme()))}
          >
            <Monitor className="mr-2 size-4" />
            Toggle appearance
          </CommandItem>
          <CommandItem
            value="Set appearance light"
            onSelect={() => closeAndRun(() => setTheme("light"))}
          >
            <Sun className="mr-2 size-4" />
            Appearance: Light
          </CommandItem>
          <CommandItem
            value="Set appearance dark"
            onSelect={() => closeAndRun(() => setTheme("dark"))}
          >
            <Moon className="mr-2 size-4" />
            Appearance: Dark
          </CommandItem>
          <CommandItem
            value="Set appearance system"
            onSelect={() => closeAndRun(() => setTheme("system"))}
          >
            <Settings className="mr-2 size-4" />
            Appearance: System
          </CommandItem>

          <CommandItem
            value="Toggle money visibility"
            onSelect={() => closeAndRun(toggleMoneyVisibility)}
          >
            {moneyVisible ? (
              <EyeOff className="mr-2 size-4" />
            ) : (
              <Eye className="mr-2 size-4" />
            )}
            Toggle money visibility
          </CommandItem>
          <CommandItem
            value="Toggle owed visibility"
            onSelect={() => closeAndRun(toggleShowOwedInBalance)}
          >
            <HandCoins className="mr-2 size-4" />
            Toggle owed visibility
            <span className="text-muted-foreground ml-2 text-xs">
              {showOwedInBalance ? "On" : "Off"}
            </span>
          </CommandItem>

          <CommandItem
            value="Open bill sheet"
            onSelect={() =>
              closeAndRun(() => {
                if (!walletId) return;
                const currentSearchParams = new URLSearchParams(searchParams);
                currentSearchParams.set("bills", "open");
                router.push(
                  `/app/transactions/${walletId}?${currentSearchParams.toString()}`,
                );
              })
            }
            disabled={!walletId || !featureFlags.bills_enabled}
          >
            <Receipt className="mr-2 size-4" />
            Open bill sheet
          </CommandItem>
          <CommandItem
            value="Toggle charts view"
            onSelect={() =>
              closeAndRun(() => {
                const currentSearchParams = new URLSearchParams(searchParams);
                const queryString = currentSearchParams.toString();
                const hrefQuery = queryString ? `?${queryString}` : "";
                const showingCharts = pathname.includes("infographics");

                if (showingCharts) {
                  router.push(
                    walletId
                      ? `/app/transactions/${walletId}${hrefQuery}`
                      : `/app/transactions${hrefQuery}`,
                  );
                  return;
                }

                router.push(
                  walletId
                    ? `/app/infographics/${walletId}${hrefQuery}`
                    : `/app/infographics${hrefQuery}`,
                );
              })
            }
          >
            <ChartArea className="mr-2 size-4" />
            Toggle charts view
          </CommandItem>
          <CommandItem
            value="Open advisor report"
            onSelect={() =>
              closeAndRun(() => router.push("/app/settings/reports"))
            }
          >
            <FileText className="mr-2 size-4" />
            Open advisor report
          </CommandItem>

          <CommandItem
            value="Add recurrent transaction"
            onSelect={() =>
              closeAndRun(() => {
                router.push("/app/settings/recurrent-transactions?new=1");
              })
            }
          >
            <Repeat className="mr-2 size-4" />
            Add recurrent transaction
          </CommandItem>
          <CommandItem
            value="Add recurrent bill"
            onSelect={() =>
              closeAndRun(() =>
                router.push("/app/settings/bills?new=recurrent"),
              )
            }
            disabled={!featureFlags.bills_enabled}
          >
            <FileClock className="mr-2 size-4" />
            Add recurrent bill
          </CommandItem>
          <CommandItem
            value="Add bill"
            onSelect={() =>
              closeAndRun(() => router.push("/app/settings/bills?new=bill"))
            }
            disabled={!featureFlags.bills_enabled}
          >
            <Receipt className="mr-2 size-4" />
            Add bill
          </CommandItem>
          <CommandItem
            value="Add template"
            onSelect={() =>
              closeAndRun(() => router.push("/app/settings/templates?new=1"))
            }
          >
            <FilePlus className="mr-2 size-4" />
            Add template
          </CommandItem>
          <CommandItem
            value="Add label"
            onSelect={() =>
              closeAndRun(() => router.push("/app/settings/labels?new=1"))
            }
          >
            <Bookmark className="mr-2 size-4" />
            Add label
          </CommandItem>
          <CommandItem
            value="Add category"
            onSelect={() =>
              closeAndRun(() => router.push("/app/settings/categories?new=1"))
            }
          >
            <Folder className="mr-2 size-4" />
            Add category
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Wallets">
          {wallets.map((wallet) => (
            <CommandItem
              key={wallet.id}
              value={`Wallet ${wallet.name} ${wallet.currency} ${getWalletTypeLabel(wallet.wallet_type)}`}
              onSelect={() =>
                closeAndRun(() => {
                  const href = buildTransactionUrl({
                    walletId: wallet.id,
                    from: fromDate,
                    to: toDate,
                    searchParams,
                    pathname,
                  });
                  router.push(href);
                })
              }
            >
              <WalletTypeIcon
                walletType={wallet.wallet_type}
                className="mr-2 size-4"
              />
              {wallet.name}
              <span className="text-muted-foreground ml-2 text-xs">
                {wallet.currency}
              </span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Workspaces">
          {workspaces.map((workspace) => (
            <CommandItem
              key={workspace.id}
              value={`Workspace ${workspace.name}`}
              onSelect={() =>
                closeAndRun(async () => {
                  await switchWorkspace(workspace.id);
                  router.push("/app/transactions");
                })
              }
            >
              <Building2 className="mr-2 size-4" />
              {workspace.name}
              {workspace.id === activeWorkspace?.id && (
                <span className="text-muted-foreground ml-2 text-xs">
                  Current
                </span>
              )}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Navigation">
          <CommandItem
            value="Go to wallets"
            onSelect={() => closeAndRun(() => router.push("/app/wallets"))}
          >
            <CreditCard className="mr-2 size-4" />
            Go to wallets
          </CommandItem>
          <CommandItem
            value="Go to infographics"
            onSelect={() =>
              closeAndRun(() =>
                router.push(
                  walletId
                    ? `/app/infographics/${walletId}`
                    : "/app/infographics",
                ),
              )
            }
          >
            <ChartArea className="mr-2 size-4" />
            Go to infographics
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Settings">
          <CommandItem
            value="Settings workspaces"
            onSelect={() =>
              closeAndRun(() => router.push("/app/settings/workspaces"))
            }
          >
            <Building2 className="mr-2 size-4" />
            Workspaces
          </CommandItem>
          <CommandItem
            value="Settings wallets"
            onSelect={() =>
              closeAndRun(() => router.push("/app/settings/wallets"))
            }
          >
            <WalletTypeIcon className="mr-2 size-4" />
            Wallets
          </CommandItem>
          <CommandItem
            value="Settings members"
            onSelect={() =>
              closeAndRun(() => router.push("/app/settings/members"))
            }
          >
            <Building2 className="mr-2 size-4" />
            Members
          </CommandItem>
          <CommandItem
            value="Settings integrations"
            onSelect={() =>
              closeAndRun(() => router.push("/app/settings/integrations"))
            }
          >
            <Landmark className="mr-2 size-4" />
            Integrations
          </CommandItem>
          <CommandItem
            value="Settings preferences"
            onSelect={() =>
              closeAndRun(() => router.push("/app/settings/preferences"))
            }
          >
            <Settings className="mr-2 size-4" />
            Preferences
          </CommandItem>
          <CommandItem
            value="Settings recurrent transactions"
            onSelect={() =>
              closeAndRun(() =>
                router.push("/app/settings/recurrent-transactions"),
              )
            }
          >
            <Repeat className="mr-2 size-4" />
            Periodic transactions
          </CommandItem>
          <CommandItem
            value="Settings categories"
            onSelect={() =>
              closeAndRun(() => router.push("/app/settings/categories"))
            }
          >
            <Folder className="mr-2 size-4" />
            Categories
          </CommandItem>
          <CommandItem
            value="Settings labels"
            onSelect={() =>
              closeAndRun(() => router.push("/app/settings/labels"))
            }
          >
            <Bookmark className="mr-2 size-4" />
            Labels
          </CommandItem>
          <CommandItem
            value="Settings tags"
            onSelect={() =>
              closeAndRun(() => router.push("/app/settings/tags"))
            }
          >
            <Hash className="mr-2 size-4" />
            Tags
          </CommandItem>
          <CommandItem
            value="Settings views"
            onSelect={() =>
              closeAndRun(() => router.push("/app/settings/views"))
            }
          >
            <Settings className="mr-2 size-4" />
            Views
          </CommandItem>
          <CommandItem
            value="Settings templates"
            onSelect={() =>
              closeAndRun(() => router.push("/app/settings/templates"))
            }
          >
            <FilePlus className="mr-2 size-4" />
            Templates
          </CommandItem>
          {featureFlags.bills_enabled && (
            <CommandItem
              value="Settings bills"
              onSelect={() =>
                closeAndRun(() => router.push("/app/settings/bills"))
              }
            >
              <Receipt className="mr-2 size-4" />
              Bills
            </CommandItem>
          )}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
