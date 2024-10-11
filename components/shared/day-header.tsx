import React, { memo } from "react";
import { format } from "date-fns";

import AddTransactionButton from "./add-transaction-button";

interface DayHeaderProps {
  date: string;
  walletId?: string;
}

const DayHeader: React.FC<DayHeaderProps> = ({ date, walletId }) => {
  return (
    <div className="bg-muted/40 h-8 flex items-center justify-between px-4 text-xs">
      <p>{format(new Date(date), "PP")}</p>
      {walletId && (
        <AddTransactionButton type="expense" walletId={walletId} date={date} />
      )}
    </div>
  );
};

export default memo(DayHeader);
