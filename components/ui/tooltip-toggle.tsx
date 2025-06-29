"use client";

import * as React from "react";
import { Toggle } from "@/components/ui/toggle";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type ToggleProps = React.ComponentProps<typeof Toggle>;

interface TooltipToggleProps extends ToggleProps {
  tooltip: string;
  children: React.ReactNode;
}

export function TooltipToggle({
  tooltip,
  children,
  ...toggleProps
}: TooltipToggleProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Toggle {...toggleProps}>{children}</Toggle>
        </TooltipTrigger>
        <TooltipContent>
          <p>{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
