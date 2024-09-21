"use client";

import { useRouter, useSearchParams } from "next/navigation";

import Subject from "./subject";

import { Subject as SubjectType } from "@/utils/supabase/types";

interface SubjectFilterProps {
  options: SubjectType[];
  value?: string;
  onChange?: (id: string) => void;
}

const SubjectFilter = ({ options }: SubjectFilterProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const value = searchParams.get("subject_id");

  const handleCategoryClick = (id: string) => {
    const params = new URLSearchParams(searchParams.toString());

    // Update the 'subject_id' search param
    if (id === value) {
      params.delete("subject_id"); // Remove the subject_id if already selected
    } else {
      params.set("subject_id", id); // Set the new subject_id
    }

    // Push the new search param to the URL
    router.push(`?${params.toString()}`, { scroll: false });
  };
  return (
    <div className="grid grid-cols-8 gap-2 p-2">
      {options.map((subject) => (
        <Subject
          key={subject.id}
          subject={subject}
          isSelected={value === subject.id}
          onClick={() => {
            handleCategoryClick(subject.id);
          }}
        />
      ))}
    </div>
  );
};

export default SubjectFilter;
