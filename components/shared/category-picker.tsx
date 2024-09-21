import { useState } from "react";

import Category from "./category";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Category as CategoryType } from "@/utils/supabase/types";

interface CategoryPickerProps {
  options: CategoryType[];
  name: string;
  onChange: (id: string) => void;
}

const CategoryPicker = ({ options, onChange }: CategoryPickerProps) => {
  const [selected, setSelected] = useState<CategoryType | null>(null);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full">
          {selected ? (
            <>
              <Category key={selected.id} category={selected} />
            </>
          ) : (
            "Choose Icon"
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full">
        <div className="grid grid-cols-8 gap-2 p-2">
          {options.map((subject) => (
            <Category
              key={subject.id}
              category={subject}
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

export default CategoryPicker;
