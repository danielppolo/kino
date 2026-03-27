import { TentTree } from "lucide-react";

import { Subtitle, Text } from "../ui/typography";

const EmptyState = ({
  title,
  description,
  variant="default",
}: {
  title: string;
  description: string;
  variant?: "default" | "compact";
}) => {

  if (variant === "compact") {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 text-center text-sm">
        <Text className="text-muted-foreground">{description}</Text>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
      <TentTree className="size-10 stroke-1" />
      <div className="flex flex-col items-center gap-0">
        <Subtitle className="text-foreground">{title}</Subtitle>
        <Text className="text-muted-foreground">{description}</Text>
      </div>
    </div>
  );
};

export default EmptyState;
