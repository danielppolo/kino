"use client";

import { useEffect, useState } from "react";
import { DollarSign, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useTransactionQueryState } from "@/hooks/use-transaction-query";

const AmountFilter = () => {
  const [filters, setFilters] = useTransactionQueryState();
  const minAmount = filters.min_amount || undefined;
  const maxAmount = filters.max_amount || undefined;
  const [open, setOpen] = useState(false);
  const [minValue, setMinValue] = useState(minAmount || "");
  const [maxValue, setMaxValue] = useState(maxAmount || "");

  useEffect(() => {
    if (!open) {
      setMinValue(minAmount || "");
      setMaxValue(maxAmount || "");
    }
  }, [minAmount, maxAmount, open]);

  const setAmountRange = (min: string | undefined, max: string | undefined) => {
    setFilters({
      min_amount: min && min.trim() ? min.trim() : null,
      max_amount: max && max.trim() ? max.trim() : null,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAmountRange(minValue || undefined, maxValue || undefined);
    setOpen(false);
  };

  const handleClear = () => {
    setMinValue("");
    setMaxValue("");
    setAmountRange(undefined, undefined);
    setOpen(false);
  };

  const hasFilter = minAmount || maxAmount;
  const filterLabel = hasFilter
    ? [
        minAmount ? `Min: $${minAmount}` : null,
        maxAmount ? `Max: $${maxAmount}` : null,
      ]
        .filter(Boolean)
        .join(", ")
    : "Amount";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          size="sm"
          variant={hasFilter ? "secondary" : "ghost"}
          className="w-auto justify-start"
        >
          <DollarSign className="mr-2 h-4 w-4" />
          {filterLabel}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="start">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <h4 className="leading-none font-medium">Filter by Amount</h4>
            <p className="text-muted-foreground text-sm">
              Set minimum and/or maximum amount range
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Min Amount</label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={minValue}
                onChange={(e) => setMinValue(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Max Amount</label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={maxValue}
                onChange={(e) => setMaxValue(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClear}
            >
              <X className="mr-2 h-4 w-4" />
              Clear
            </Button>
            <Button type="submit" size="sm">
              Apply
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
};

export default AmountFilter;
