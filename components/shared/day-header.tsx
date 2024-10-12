import React, { memo } from "react";
import { format, parse } from "date-fns";

interface DayHeaderProps {
  date: string;
}

const DayHeader: React.FC<DayHeaderProps> = ({ date }) => {
  return (
    <div className="bg-muted/40 h-8 flex items-center justify-between px-4 text-xs">
      <p>{format(parse(date, "yyyy-MM-dd", new Date()), "PP")}</p>
    </div>
  );
};

export const DayHeaderLoading: React.FC = () => {
  return (
    <div className="bg-muted/40 h-8 flex items-center justify-between px-4 text-xs">
      <div className="h-4 w-24 rounded-md bg-muted animate-pulse" />
    </div>
  );
};

export default memo(DayHeader);
