import { Button } from "../ui/button";

import { Icon } from "@/components/ui/icon";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Subject as SubjectType } from "@/utils/supabase/types";

interface SubjectProps {
  subject: SubjectType;
  isSelected?: boolean;
  onClick?: () => void;
}

const Subject = ({ isSelected, subject, onClick }: SubjectProps) => {
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
            <Icon name={subject.icon} className="h-5 w-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{subject.name}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default Subject;
