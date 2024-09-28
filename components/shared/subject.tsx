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
  className?: string;
}

const Subject = ({ subject, className }: SubjectProps) => {
  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger className={className}>
          <Icon name={subject.icon} className="h-4 w-4" />
        </TooltipTrigger>
        <TooltipContent>
          <span>{subject.name}</span>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default Subject;
