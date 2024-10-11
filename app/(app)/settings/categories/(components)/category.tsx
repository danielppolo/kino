import { LazyIcon } from "@/components/ui/icon";

interface CategoryProps {
  data: {
    id: string;
    name: string;
    icon: string;
  };
}

export default function Category({ data }: CategoryProps) {
  return (
    <div key={data.id}>
      <LazyIcon name={data.icon} className="h-4 w-4" />
      <span>{data.name}</span>
    </div>
  );
}
