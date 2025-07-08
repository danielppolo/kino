import { cn } from "@/lib/utils";

function Row({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "group hover:bg-accent/50 relative flex h-10 cursor-pointer items-center gap-2 px-4 transition-all duration-200 ease-in-out",
        className,
      )}
      {...props}
    />
  );
}

export default Row;
