import { Icon } from "@/components/ui/icon";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Category as CategoryType } from "@/utils/supabase/types";

interface CategoryProps {
  category: CategoryType;
  className?: string;
}

const Category = ({ category, className }: CategoryProps) => {
  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger className={className}>
          <Icon name={category.icon} className="h-4 w-4" />
        </TooltipTrigger>
        <TooltipContent>
          <span>{category.name}</span>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default Category;
