"use client";

import { useRouter, useSearchParams } from "next/navigation";

interface Props {
  years: number[];
  selected: number;
}

export default function YearSelector({ years, selected }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("year", e.target.value);
    router.push(`?${params.toString()}`);
  };

  return (
    <select
      value={selected}
      onChange={handleChange}
      className="rounded border px-2 py-1 text-sm print:hidden"
    >
      {years.map((y) => (
        <option key={y} value={y}>
          {y}
        </option>
      ))}
    </select>
  );
}
