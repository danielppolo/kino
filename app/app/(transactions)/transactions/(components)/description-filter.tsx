"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const DescriptionFilter = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const description = searchParams.get("description") ?? undefined;
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(description || "");

  const setDescription = (value: string | undefined) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value.trim()) {
      params.set("description", value.trim());
    } else {
      params.delete("description");
    }
    router.push(`/app/transactions?${params.toString()}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDescription(inputValue || undefined);
    setOpen(false);
  };

  const handleClear = () => {
    setInputValue("");
    setDescription(undefined);
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSubmit(e);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          size="sm"
          variant={description ? "secondary" : "ghost"}
          className="w-auto justify-start"
        >
          <Search className="mr-2 h-4 w-4" />
          {description ? description : "Description"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="start">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <h4 className="leading-none font-medium">Search Description</h4>
            <p className="text-muted-foreground text-sm">
              Enter text to search in transaction descriptions
            </p>
          </div>
          <div className="space-y-2">
            <Input
              placeholder="Enter description..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
            />
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
              Search
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
};

export default DescriptionFilter;
