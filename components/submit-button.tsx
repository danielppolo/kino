"use client";

import { type ComponentProps } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = ComponentProps<typeof Button> & {
  isLoading?: boolean;
};

export function SubmitButton({ children, isLoading, ...props }: Props) {
  const { pending } = useFormStatus();
  const disabled = pending || isLoading;

  return (
    <Button
      type="submit"
      aria-disabled={disabled}
      disabled={disabled}
      {...props}
    >
      <div className="relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        )}
        <div className={cn(isLoading && "opacity-0")}>{children}</div>
      </div>
    </Button>
  );
}
