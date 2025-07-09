import { Binoculars } from "lucide-react";

import { Subtitle, Text } from "@/components/ui/typography";

const NotFound = () => {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 text-center">
      <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
        <Binoculars className="size-10 stroke-1" />
        <div className="flex flex-col items-center gap-0">
          <Subtitle className="text-foreground">Page not found</Subtitle>
          <Text className="text-muted-foreground">
            The page you&apos;re looking for doesn&apos;t exist.
          </Text>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
