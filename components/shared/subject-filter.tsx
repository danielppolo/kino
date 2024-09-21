"use client";

import { useRouter, useSearchParams } from "next/navigation";

import { useQuery } from "@supabase-cache-helpers/postgrest-react-query";

import Subject from "./subject";

import { createClient } from "@/utils/supabase/client";
import { listSubjects } from "@/utils/supabase/queries";
import { Subject as SubjectType } from "@/utils/supabase/types";

interface SubjectFilterProps {
  value?: string;
  onChange?: (id: string) => void;
}

const SubjectFilter = (props: SubjectFilterProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const value = searchParams.get("subject_id");
  const { data } = useQuery(listSubjects(supabase));

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
      {data?.map((subject) => (
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
