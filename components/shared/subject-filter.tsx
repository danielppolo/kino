"use client";

import { CircleDotDashed, X } from "lucide-react";

import { useQuery } from "@supabase-cache-helpers/postgrest-react-query";

import { ToggleGroup, ToggleGroupItem } from "../ui/toggle-group";
import Subject from "./subject";

import { useFilter } from "@/app/protected/filter-context";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import useSubjectDictionary from "@/hooks/useSubjectDictionary";
import { createClient } from "@/utils/supabase/client";
import { listSubjects } from "@/utils/supabase/queries";

const supabase = createClient();

const SubjectFilter = () => {
  const {
    filters: { subject_id },
    setSubjectId,
  } = useFilter();

  const { data: subjects } = useQuery(listSubjects(supabase));
  const subjectDict = useSubjectDictionary();

  if (subject_id && subjectDict[subject_id]) {
    return (
      <Button
        variant="ghost"
        className="peer group"
        size="sm"
        onClick={() => setSubjectId(undefined)}
      >
        <div className="group-hover:hidden flex items-center">
          <Subject subject={subjectDict[subject_id]} />
        </div>
        <X className="hidden h-3 w-3 group-hover:block" />
      </Button>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm">
          <CircleDotDashed className="w-3 h-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full">
        <ToggleGroup
          type="single"
          value={subject_id}
          onValueChange={setSubjectId}
          className="grid grid-cols-8 gap-2 p-2"
        >
          {subjects?.map((subject) => (
            <ToggleGroupItem key={subject.id} value={subject.id}>
              <Subject subject={subject} />
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </PopoverContent>
    </Popover>
  );
};

export default SubjectFilter;
