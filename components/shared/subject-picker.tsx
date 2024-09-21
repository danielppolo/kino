import { useState } from "react";

import { Icon } from "../ui/icon";
import Subject from "./subject";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Subject as SubjectType } from "@/utils/supabase/types";

interface SubjectPickerProps {
  options: SubjectType[];
  name: string;
  onChange: (id: string) => void;
}

const SubjectPicker = ({ options, onChange }: SubjectPickerProps) => {
  const [selected, setSelected] = useState<SubjectType | null>(null);

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
          {options.map((subject) => (
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
