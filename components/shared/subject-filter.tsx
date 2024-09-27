"use client";

import { useQuery } from "@supabase-cache-helpers/postgrest-react-query";

import Subject from "./subject";

import { useFilter } from "@/app/protected/filter-context";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { createClient } from "@/utils/supabase/client";
import { listSubjects } from "@/utils/supabase/queries";

const supabase = createClient();

const SubjectFilter = () => {
  const {
    filters: { subject_id },
    setSubjectId,
  } = useFilter();
  const { data } = useQuery(listSubjects(supabase));

  return (
    <ToggleGroup
      type="single"
      value={subject_id}
      onValueChange={setSubjectId}
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
