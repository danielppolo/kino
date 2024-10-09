import Color from "./color";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Label as LabelType } from "@/utils/supabase/types";

interface LabelProps {
  label: LabelType;
  size?: "sm" | "md" | "lg";
}

const Label = ({ label, size = "md" }: LabelProps) => {
  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Color size={size} color={label.color} />
        </TooltipTrigger>
        <TooltipContent>
          <span>{label.name}</span>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default Label;
