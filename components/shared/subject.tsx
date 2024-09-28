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
}

const Subject = ({ subject }: SubjectProps) => {
  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger>
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
