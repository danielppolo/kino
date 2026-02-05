"use client";

import { useEffect, useMemo, useState } from "react";
import { endOfMonth, format, startOfMonth } from "date-fns";
import {
  ArrowRightLeft,
  Building2,
  CreditCard,
  Landmark,
  Plus,
  Wallet,
} from "lucide-react";
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
import { useWallets } from "@/contexts/settings-context";
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

  const [wallets] = useWallets();
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
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Wallets">
          {wallets.map((wallet) => (
            <CommandItem
              key={wallet.id}
              value={`Wallet ${wallet.name} ${wallet.currency}`}
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
              <Wallet className="mr-2 size-4" />
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
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
