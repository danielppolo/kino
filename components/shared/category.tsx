import clsx from "clsx";

import { Button } from "../ui/button";

import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Category as CategoryType } from "@/utils/supabase/types";

interface CategoryProps {
  category: CategoryType;
  size?: "small" | "medium" | "large";
}

const Category = ({ category, size = "medium" }: CategoryProps) => {
  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              clsx("rounded-full", {
                "w-3 h-3": size === "small",
                "w-5 h-5": size === "medium",
                "w-8 h-8": size === "large",
              }),
            )}
            style={{ backgroundColor: category.color }}
          />
        </TooltipTrigger>
        <TooltipContent>
          <span>{category.name}</span>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default Category;
