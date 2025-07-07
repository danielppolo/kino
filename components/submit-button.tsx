"use client";

import { type ComponentProps } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";

type Props = ComponentProps<typeof Button> & {
  pendingText?: string;
  isLoading?: boolean;
};

export function SubmitButton({
  children,
  pendingText = "Submitting...",
  isLoading,
  ...props
}: Props) {
  const { pending } = useFormStatus();
  const disabled = pending || isLoading;

  return (
    <Button type="submit" aria-disabled={disabled} disabled={disabled} {...props}>
      {disabled ? pendingText : children}
    </Button>
  );
}
