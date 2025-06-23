import * as React from "react";
import { ChevronDown, XCircle, XIcon } from "lucide-react";

import { Badge } from "./badge";
import { Button } from "./button";
import { Checkbox } from "./checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "./command";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { Separator } from "./separator";
import { Text } from "./typography";

import { cn } from "@/lib/utils";

interface CreatableMultiSelectProps {
  disabled?: boolean;
  value?: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  maxCount?: number;
  options?: string[];
  className?: string;
}

export const CreatableMultiSelect = React.forwardRef<
  HTMLButtonElement,
  CreatableMultiSelectProps
>(
  (
    {
      disabled,
      value = [],
      onChange,
      placeholder = "Add items",
      maxCount = 3,
      options = [],
      className,
    },
    ref,
  ) => {
    const [isPopoverOpen, setIsPopoverOpen] = React.useState(false);
    const [inputValue, setInputValue] = React.useState("");
    const [customOptions, setCustomOptions] = React.useState<string[]>([]);

    const allOptions = React.useMemo(
      () =>
        Array.from(new Set([...(options ?? []), ...value, ...customOptions])),
      [options, value, customOptions],
    );

    const handleInputKeyDown = (
      event: React.KeyboardEvent<HTMLInputElement>,
    ) => {
      if (event.key === "Enter") {
        const trimmed = inputValue.trim();
        if (
          trimmed &&
          !allOptions.some((o) => o.toLowerCase() === trimmed.toLowerCase())
        ) {
          setCustomOptions((prev) => [...prev, trimmed]);
          const newSelected = [...value, trimmed];
          onChange(newSelected);
          setInputValue("");
        } else if (trimmed && !value.includes(trimmed)) {
          onChange([...value, trimmed]);
          setInputValue("");
        }
        setIsPopoverOpen(true);
      } else if (event.key === "Backspace" && !event.currentTarget.value) {
        const newSelected = value.slice(0, -1);
        onChange(newSelected);
      }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setInputValue(e.target.value);
    };

    const toggleOption = (option: string) => {
      if (value.includes(option)) {
        onChange(value.filter((v) => v !== option));
      } else {
        onChange([...value, option]);
      }
    };

    const handleClear = () => {
      onChange([]);
    };

    const clearExtraOptions = () => {
      onChange(value.slice(0, maxCount));
    };

    return (
      <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen} modal>
        <PopoverTrigger asChild>
          <Button
            disabled={disabled}
            ref={ref}
            type="button"
            onClick={() => setIsPopoverOpen((prev) => !prev)}
            className={cn(
              "flex h-auto min-h-10 w-full items-center justify-between rounded-md border bg-inherit p-1 hover:bg-inherit [&_svg]:pointer-events-auto",
              className,
            )}
          >
            {value.length > 0 ? (
              <div className="flex w-full items-center justify-between">
                <div className="flex flex-wrap items-center">
                  {value.slice(0, maxCount).map((val) => (
                    <Badge key={val} className="m-1">
                      {val}
                      <XCircle
                        className="ml-2 h-4 w-4 cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleOption(val);
                        }}
                      />
                    </Badge>
                  ))}
                  {value.length > maxCount && (
                    <Badge className="text-foreground border-foreground/10 bg-transparent hover:bg-transparent">
                      {`+ ${value.length - maxCount} more`}
                      <XCircle
                        className="ml-2 h-4 w-4 cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          clearExtraOptions();
                        }}
                      />
                    </Badge>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <XIcon
                    className="text-muted-foreground mx-2 h-4 cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClear();
                    }}
                  />
                  <Separator
                    orientation="vertical"
                    className="flex h-full min-h-6"
                  />
                  <ChevronDown className="text-muted-foreground mx-2 h-4 cursor-pointer" />
                </div>
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
          className="w-auto p-0"
          align="start"
          onEscapeKeyDown={() => setIsPopoverOpen(false)}
        >
          <Command>
            <CommandInput
              placeholder="Type and press Enter to add..."
              value={inputValue}
              onValueChange={setInputValue}
              onKeyDown={handleInputKeyDown}
            />
            <CommandList>
              <CommandEmpty>No results found.</CommandEmpty>
              <CommandGroup>
                {inputValue.trim() &&
                  !allOptions.some(
                    (o) => o.toLowerCase() === inputValue.trim().toLowerCase(),
                  ) && (
                    <CommandItem
                      forceMount
                      key="create-option"
                      onSelect={() => {
                        const trimmed = inputValue.trim();
                        if (!trimmed) return;
                        setCustomOptions((prev) => [...prev, trimmed]);
                        onChange([...value, trimmed]);
                        setInputValue("");
                      }}
                      className="text-primary cursor-pointer"
                    >
                      <span>Add &quot;{inputValue.trim()}&quot;</span>
                    </CommandItem>
                  )}
                {allOptions.map((option) => {
                  const isSelected = value.includes(option);
                  return (
                    <CommandItem
                      key={option}
                      keywords={[option]}
                      onSelect={() => toggleOption(option)}
                      className="flex cursor-pointer items-center gap-2"
                    >
                      <Checkbox checked={isSelected} />
                      <Text as="span">{option}</Text>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
              <CommandSeparator />
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
                    onSelect={() => setIsPopoverOpen(false)}
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

CreatableMultiSelect.displayName = "CreatableMultiSelect";
export default CreatableMultiSelect;
