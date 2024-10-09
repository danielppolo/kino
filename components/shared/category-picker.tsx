"use client";

import { CircleDotDashed } from "lucide-react";

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
  type: "income" | "expense";
  defaultValue?: string;
  value?: string | null;
  onChange: (id: string) => void;
}
const supabase = createClient();

const CategoryPicker = ({
  value,
  defaultValue,
  type,
  onChange,
}: CategoryPickerProps) => {
  const { data } = useQuery(listCategories(supabase));
  const categoryDict = useCategoryDictionary();

  const categories = data?.filter((category) => category.type === type);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm">
          {value && categoryDict[value] ? (
            <>
              <Category category={categoryDict[value]} />
            </>
          ) : (
            <CircleDotDashed className="w-3 h-3" />
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
              <Category category={category} />
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </PopoverContent>
    </Popover>
  );
};

export default CategoryPicker;
