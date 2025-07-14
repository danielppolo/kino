import React, { memo } from "react";
import { format, parse } from "date-fns";

import { Text } from "../ui/typography";

import { DAY_HEADER_HEIGHT } from "@/utils/constants";

interface RowGroupHeaderProps {
  title: string;
}

const RowGroupHeader: React.FC<RowGroupHeaderProps> = ({ title }) => {
  return (
    <div
      className="bg-muted/40 border-muted flex items-center justify-between border-t px-4"
      style={{
        height: DAY_HEADER_HEIGHT,
      }}
    >
      <Text muted small>
        {title}
      </Text>
    </div>
  );
};

export const RowGroupHeaderLoading: React.FC = () => {
  return (
    <div className="bg-muted/40 flex h-8 items-center justify-between px-4">
      <div className="bg-muted h-4 w-24 animate-pulse rounded-md" />
    </div>
  );
};

export default memo(RowGroupHeader);
