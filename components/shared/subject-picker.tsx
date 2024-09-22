import { useState } from "react";

import { useQuery } from "@supabase-cache-helpers/postgrest-react-query";

import { ToggleGroup, ToggleGroupItem } from "../ui/toggle-group";
import Subject from "./subject";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import useSubjectDictionary from "@/hooks/useSubjectDictionary";
import { createClient } from "@/utils/supabase/client";
import { listSubjects } from "@/utils/supabase/queries";
import { Subject as SubjectType } from "@/utils/supabase/types";

interface SubjectPickerProps {
  defaultValue?: string;
  value?: string;
  onChange: (id: string) => void;
}

const SubjectPicker = ({
  onChange,
  value,
  defaultValue,
}: SubjectPickerProps) => {
  const supabase = createClient();
  const { data: subjects } = useQuery(listSubjects(supabase));
  const subjectDict = useSubjectDictionary();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost">
          {value && subjectDict[value] ? (
            <>
              <Subject subject={subjectDict[value]} />
            </>
          ) : (
            "Choose Icon"
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full">
        <ToggleGroup
          type="single"
          defaultValue={defaultValue}
          onValueChange={onChange}
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

export default SubjectPicker;
