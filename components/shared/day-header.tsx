import React, { memo } from "react";
import { format, parse } from "date-fns";

import { Text } from "../ui/typography";

import { DAY_HEADER_HEIGHT } from "@/utils/constants";

interface DayHeaderProps {
  date: string;
}

const DayHeader: React.FC<DayHeaderProps> = ({ date }) => {
  return (
    <div
      className="bg-muted/40 border-muted flex items-center justify-between border-t px-4"
      style={{
        height: DAY_HEADER_HEIGHT,
      }}
    >
      <Text muted small>
        {format(parse(date, "yyyy-MM-dd", new Date()), "PP")}
      </Text>
    </div>
  );
};

export const DayHeaderLoading: React.FC = () => {
  return (
    <div className="bg-muted/40 flex h-8 items-center justify-between px-4">
      <div className="bg-muted h-4 w-24 animate-pulse rounded-md" />
    </div>
  );
};

export default memo(DayHeader);
