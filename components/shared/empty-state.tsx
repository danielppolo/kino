import { TentTree } from "lucide-react";

import { Subtitle, Text } from "../ui/typography";

const EmptyState = () => {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
      <TentTree className="size-10 stroke-1" />
      <div className="flex flex-col items-center gap-0">
        <Subtitle className="text-foreground">No transactions found</Subtitle>
        <Text className="text-muted-foreground">
          Please try again or add a new transaction.
        </Text>
      </div>
    </div>
  );
};

export default EmptyState;
