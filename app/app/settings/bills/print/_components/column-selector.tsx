"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

interface Group {
  key: string;
  label: string;
}

interface Props {
  groups: Group[];
  selected: string[];
}

export default function ColumnSelector({ groups, selected }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);

  const toggle = (key: string) => {
    const next = selected.includes(key)
      ? selected.filter((k) => k !== key)
      : [...selected, key];

    const params = new URLSearchParams(searchParams.toString());
    if (next.length === 0) {
      params.delete("cols");
    } else {
      params.set("cols", next.join(","));
    }
    router.push(`?${params.toString()}`);
  };

  const buttonLabel =
    selected.length === 0
      ? "Todas las columnas"
      : `${selected.length} columna${selected.length === 1 ? "" : "s"}`;

  return (
    <div className="relative print:hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="rounded border px-2 py-1 text-sm"
      >
        {buttonLabel}
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-full z-20 mt-1 max-h-72 min-w-48 overflow-y-auto rounded border bg-background shadow-md">
            {groups.map((g) => (
              <label
                key={g.key}
                className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(g.key)}
                  onChange={() => toggle(g.key)}
                />
                {g.label}
              </label>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
