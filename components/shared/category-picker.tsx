import { useState } from "react";

import { useQuery } from "@supabase-cache-helpers/postgrest-react-query";

import Category from "./category";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { createClient } from "@/utils/supabase/client";
import { listCategories } from "@/utils/supabase/queries";
import { Category as CategoryType } from "@/utils/supabase/types";

interface CategoryPickerProps {
  defaultValue?: CategoryType;
  onChange: (id: string) => void;
}

const CategoryPicker = ({ onChange, defaultValue }: CategoryPickerProps) => {
  const supabase = createClient();
  const { data: categories } = useQuery(listCategories(supabase));
  const [selected, setSelected] = useState(defaultValue);

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
          {categories?.map((subject) => (
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
