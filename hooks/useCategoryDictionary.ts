import { Category } from "@/utils/supabase/types";

const useCategoryDictionary = (data: Category[]) => {
  return data.reduce((acc, category) => {
    acc[category.id] = category;
    return acc;
  }, {});
};

export default useCategoryDictionary;
