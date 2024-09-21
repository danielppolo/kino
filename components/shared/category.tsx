import { Button } from "../ui/button";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Category as CategoryType } from "@/utils/supabase/types";

interface CategoryProps {
  category: CategoryType;
  isSelected?: boolean;
  onClick?: () => void;
}

const Category = ({ isSelected, category, onClick }: CategoryProps) => {
  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={isSelected ? "outline" : "ghost"}
            type="button"
            className={`p-2 rounded-full transition-colors`}
            onClick={onClick}
          >
            {/* The circle is created via the button's background */}
            <div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: category.color }}
            />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{category.name}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default Category;
