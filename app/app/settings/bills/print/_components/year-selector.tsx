"use client";

import { useRouter, useSearchParams } from "next/navigation";

interface Props {
  years: number[];
  selected: number | null;
}

export default function YearSelector({ years, selected }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const params = new URLSearchParams(searchParams.toString());
    if (e.target.value) {
      params.set("year", e.target.value);
    } else {
      params.delete("year");
    }
    // Clear manual selection so the year shortcut takes effect
    params.delete("cols");
    router.push(`?${params.toString()}`);
  };

  return (
    <select
      value={selected ?? ""}
      onChange={handleChange}
      className="rounded border px-2 py-1 text-sm print:hidden"
    >
      <option value="">Año</option>
      {years.map((y) => (
        <option key={y} value={y}>
          {y}
        </option>
      ))}
    </select>
  );
}
