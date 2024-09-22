import { useQuery } from "@supabase-cache-helpers/postgrest-react-query";

import { createClient } from "@/utils/supabase/client";
import { listCategories, listSubjects } from "@/utils/supabase/queries";
import { Category } from "@/utils/supabase/types";

const useCategoryDictionary = () => {
  const supabase = createClient();
  const { data } = useQuery(listCategories(supabase), {
    select(res) {
      const data = res.data?.reduce((acc, cat) => {
        acc[cat.id] = cat;
        return acc;
      }, {});
      return { ...res, data };
    },
  });

  return (data ?? {}) as any as Record<string, Category>;
};

export default useCategoryDictionary;
