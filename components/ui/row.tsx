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

export function RowLoading() {
  return (
    <div className="flex h-10 items-center gap-2 px-4">
      <div className="bg-muted h-4 w-4 animate-pulse rounded-full" />
      <div className="bg-muted h-4 w-24 animate-pulse rounded" />
      <div className="bg-muted h-4 w-32 animate-pulse rounded" />
    </div>
  );
}

export default Row;
