import { useState } from "react";

import { useQuery } from "@supabase-cache-helpers/postgrest-react-query";

import Subject from "./subject";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { createClient } from "@/utils/supabase/client";
import { listSubjects } from "@/utils/supabase/queries";
import { Subject as SubjectType } from "@/utils/supabase/types";

interface SubjectPickerProps {
  defaultValue?: SubjectType;
  onChange: (id: string) => void;
}

const SubjectPicker = ({ onChange, defaultValue }: SubjectPickerProps) => {
  const [selected, setSelected] = useState(defaultValue);
  const supabase = createClient();
  const { data: subjects } = useQuery(listSubjects(supabase));

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full">
          {selected ? (
            <>
              <Subject key={selected.id} subject={selected} />
            </>
          ) : (
            "Choose Icon"
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full">
        <div className="grid grid-cols-8 gap-2 p-2">
          {subjects?.map((subject) => (
            <Subject
              key={subject.id}
              subject={subject}
              onClick={() => {
                setSelected(subject);
                onChange(subject.id);
              }}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default SubjectPicker;
