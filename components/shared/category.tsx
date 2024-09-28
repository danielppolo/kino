import clsx from "clsx";

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
  size?: "sm" | "md" | "lg";
}

const Category = ({ category, size = "md" }: CategoryProps) => {
  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              clsx("rounded-full", {
                "w-2.5 h-2.5": size === "sm",
                "w-5 h-5": size === "md",
                "w-8 h-8": size === "lg",
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
