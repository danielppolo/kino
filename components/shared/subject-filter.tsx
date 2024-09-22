"use client";

import { useRouter, useSearchParams } from "next/navigation";

import { useQuery } from "@supabase-cache-helpers/postgrest-react-query";

import Subject from "./subject";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { createClient } from "@/utils/supabase/client";
import { listSubjects } from "@/utils/supabase/queries";

interface SubjectFilterProps {
  value?: string;
  onChange?: (id: string) => void;
}

const SubjectFilter = (props: SubjectFilterProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const value = searchParams.get("subject_id");
  const supabase = createClient();
  const { data } = useQuery(listSubjects(supabase));

  const handleSubjectClick = (id: string) => {
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
    <ToggleGroup
      type="single"
      defaultValue={value ?? undefined}
      onValueChange={handleSubjectClick}
      className="flex justify-start overflow-x-auto no-scrollbar flex-nowrap gap-2 p-2"
    >
      {data?.map((subject) => (
        <ToggleGroupItem
          key={subject.id}
          value={subject.id}
          aria-label="Toggle bold"
        >
          <Subject subject={subject} />
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
};

export default SubjectFilter;
