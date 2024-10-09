import Color from "@/components/shared/color";

interface CategoryProps {
  data: {
    id: string;
    name: string;
    color: string;
  };
}

export default function Category({ data }: CategoryProps) {
  return (
    <div key={data.id}>
      <Color size="sm" color={data.color} />
      <span>{data.name}</span>
    </div>
  );
}
