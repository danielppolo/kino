import { useQuery } from "@supabase-cache-helpers/postgrest-react-query";

import { ToggleGroup, ToggleGroupItem } from "../ui/toggle-group";
import Category from "./category";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import useCategoryDictionary from "@/hooks/useCategoryDictionary";
import { createClient } from "@/utils/supabase/client";
import { listCategories } from "@/utils/supabase/queries";

interface CategoryPickerProps {
  defaultValue?: string;
  value?: string;
  onChange: (id: string) => void;
}

const CategoryPicker = ({
  onChange,
  defaultValue,
  value,
}: CategoryPickerProps) => {
  const supabase = createClient();
  const { data: categories } = useQuery(listCategories(supabase));
  const categoriesDict = useCategoryDictionary();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm">
          {value && categoriesDict[value] ? (
            <>
              <Category category={categoriesDict[value]} size="small" />
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
          {categories?.map((category) => (
            <ToggleGroupItem key={category.id} value={category.id}>
              <Category category={category} size="small" />
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </PopoverContent>
    </Popover>
  );
};

export default CategoryPicker;
