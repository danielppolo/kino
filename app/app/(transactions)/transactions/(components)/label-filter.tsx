"use client";

import { useRouter, useSearchParams } from "next/navigation";

import LabelCombobox from "@/components/shared/label-combobox";

const LabelFilter = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const labelId = searchParams.get("label_id") ?? undefined;

  const setLabelId = (id: string | undefined) => {
    const params = new URLSearchParams(searchParams.toString());
    if (id) {
      params.set("label_id", id);
    } else {
      params.delete("label_id");
    }
    router.push(`/app/transactions?${params.toString()}`);
  };

  const handleLabelChange = (id: string) => {
    setLabelId(id);
  };

  return (
    <LabelCombobox
      size="sm"
      value={labelId ?? null}
      onChange={handleLabelChange}
      placeholder="Label"
      className="w-auto"
    />
  );
};

export default LabelFilter;
