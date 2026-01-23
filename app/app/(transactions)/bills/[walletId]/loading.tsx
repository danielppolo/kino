import { RowGroupHeaderLoading } from "@/components/shared/row-group-header";
import { RowLoading } from "@/components/ui/row";

export default function Loading() {
  return (
    <div
      style={{ height: "calc(100vh - 44px - 44px)", overflow: "auto" }}
      className="relative w-full divide-y overflow-hidden"
    >
      <RowGroupHeaderLoading />
      {Array.from({ length: 5 }).map((_, index) => (
        <RowLoading key={index} />
      ))}
      <RowGroupHeaderLoading />
      {Array.from({ length: 3 }).map((_, index) => (
        <RowLoading key={`b-${index}`} />
      ))}
      <RowGroupHeaderLoading />
      {Array.from({ length: 4 }).map((_, index) => (
        <RowLoading key={`c-${index}`} />
      ))}
    </div>
  );
}

