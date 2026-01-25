"use client";

import * as React from "react";
import { format } from "date-fns";
import { ChevronDown, XCircle } from "lucide-react";

import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Separator } from "../ui/separator";
import { Text } from "../ui/typography";
import TransactionAmount from "./transaction-amount";
import TransactionDescription from "./transaction-description";

import { cn } from "@/lib/utils";
import { TransactionList } from "@/utils/supabase/types";

interface TransactionMultiSelectProps {
  disabled?: boolean;
  value?: string[];
  onChange: (value: string[]) => void;
  transactions: TransactionList[];
  placeholder?: string;
  className?: string;
}

const TransactionMultiSelect = React.forwardRef<
  HTMLButtonElement,
  TransactionMultiSelectProps
>(
  (
    {
      disabled,
      value = [],
      onChange,
      transactions,
      placeholder = "Select transactions",
      className,
    },
    ref,
  ) => {
    const [open, setOpen] = React.useState(false);
    const [query, setQuery] = React.useState("");

    const toggleOption = (transactionId: string) => {
      if (value.includes(transactionId)) {
        onChange(value.filter((v) => v !== transactionId));
      } else {
        onChange([...value, transactionId]);
      }
    };

    const handleClear = () => {
      onChange([]);
      setOpen(false);
    };

    const q = query.toLowerCase();
    const filteredTransactions = transactions.filter((t) => {
      const desc = t.description?.toLowerCase() ?? "";
      const date = t.date ?? "";
      return desc.includes(q) || date.includes(q);
    });

    const selectedTransactions = transactions.filter((t) =>
      value.includes(t.id!),
    );

    return (
      <Popover open={open} onOpenChange={setOpen} modal>
        <PopoverTrigger asChild>
          <Button
            ref={ref}
            type="button"
            variant="outline"
            size="sm"
            className={cn(
              "flex h-auto min-h-10 w-full items-center justify-between rounded-md p-1",
              className,
            )}
            disabled={disabled}
            onClick={() => setOpen((o) => !o)}
          >
            {value.length > 0 ? (
              <div className="flex w-full items-center justify-between">
                <div className="flex flex-wrap items-center gap-1">
                  {selectedTransactions.slice(0, 2).map((transaction) => (
                    <Badge key={transaction.id} className="m-1">
                      {transaction.description || "No description"}
                      <XCircle
                        className="ml-2 h-4 w-4 cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleOption(transaction.id!);
                        }}
                      />
                    </Badge>
                  ))}
                  {value.length > 2 && (
                    <Badge className="text-foreground border-foreground/10 bg-transparent hover:bg-transparent">
                      +{value.length - 2} more
                    </Badge>
                  )}
                </div>
                <ChevronDown className="text-muted-foreground mx-2 h-4 shrink-0 cursor-pointer" />
              </div>
            ) : (
              <div className="mx-auto flex w-full items-center justify-between">
                <span className="text-muted-foreground mx-3 text-sm">
                  {placeholder}
                </span>
                <ChevronDown className="text-muted-foreground mx-2 h-4 cursor-pointer" />
              </div>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="min-w-[var(--radix-popover-trigger-width)] p-0"
          align="start"
          onEscapeKeyDown={() => setOpen(false)}
        >
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Search transactions..."
              value={query}
              onValueChange={setQuery}
            />
            <CommandList>
              <CommandEmpty>No transactions found.</CommandEmpty>
              <CommandGroup>
                {filteredTransactions.map((transaction) => {
                  const selected = value.includes(transaction.id!);
                  return (
                    <CommandItem
                      key={transaction.id}
                      value={transaction.id!}
                      onSelect={() => toggleOption(transaction.id!)}
                      className="flex cursor-pointer items-center gap-2"
                    >
                      <Checkbox checked={selected} />
                      <div className="flex min-w-0 flex-1 items-center gap-2">
                        <div className="min-w-0 flex-1 truncate">
                          <TransactionDescription transaction={transaction} />
                        </div>
                        <div className="shrink-0">
                          <Text muted>
                            {format(new Date(transaction.date!), "MMM d, yyyy")}
                          </Text>
                        </div>
                        <div className="shrink-0">
                          <TransactionAmount
                            className="text-right"
                            amount={transaction.amount_cents!}
                            currency={transaction.currency!}
                          />
                        </div>
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
              <CommandGroup>
                <div className="flex items-center justify-between">
                  {value.length > 0 && (
                    <>
                      <CommandItem
                        onSelect={handleClear}
                        className="flex-1 cursor-pointer justify-center"
                      >
                        Clear
                      </CommandItem>
                      <Separator
                        orientation="vertical"
                        className="flex h-full min-h-6"
                      />
                    </>
                  )}
                  <CommandItem
                    onSelect={() => setOpen(false)}
                    className="max-w-full flex-1 cursor-pointer justify-center"
                  >
                    Close
                  </CommandItem>
                </div>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    );
  },
);

TransactionMultiSelect.displayName = "TransactionMultiSelect";
export default TransactionMultiSelect;
